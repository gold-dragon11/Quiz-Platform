import {
  ConflictException,
  ForbiddenException,
  Injectable,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AccountStatus, Language, Prisma, UserRole } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import type { SignOptions } from 'jsonwebtoken';
import { AppConfig } from '../../config/configuration';
import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { AuthRepository } from '../repositories/auth.repository';
import { CurrentUserResponse } from '../types/current-user-response.type';
import { TokenPair } from '../types/token-pair.type';
import { PasswordUtil } from '../utils/password.util';

/** Prisma error code raised when a unique constraint is violated. */
const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

/**
 * The single response used for every failed credential check — unknown email,
 * wrong password, or a soft-deleted account — so none of them can be told
 * apart (docs/04-api/authentication.md §6).
 */
const INVALID_CREDENTIALS_MESSAGE = 'Invalid email or password.';

/**
 * Authentication use cases (docs/06-backend/authentication.md §2).
 *
 * Registration is implemented here; login, token refresh, logout, email
 * verification, and password reset belong to later phases.
 */
@Injectable()
export class AuthService implements OnModuleInit {
  /**
   * A throwaway hash verified when no usable account matches the submitted
   * email. It makes a failed lookup cost the same Argon2 work as a real
   * password check, so response time cannot be used to probe which emails are
   * registered.
   */
  private decoyPasswordHash!: string;

  constructor(
    private readonly authRepository: AuthRepository,
    private readonly passwordUtil: PasswordUtil,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<AppConfig, true>,
  ) {}

  async onModuleInit(): Promise<void> {
    this.decoyPasswordHash = await this.passwordUtil.hashPassword(
      randomBytes(32).toString('hex'),
    );
  }

  /**
   * Registers a new account and the records it owns
   * (docs/01-prd/authentication.md §3, docs/04-api/authentication.md §4).
   *
   * The account is created in a Pending Verification state; sending the
   * verification email is a later phase.
   */
  async register(dto: RegisterDto): Promise<void> {
    await this.assertCredentialsAvailable(dto.email, dto.username);

    const passwordHash = await this.passwordUtil.hashPassword(dto.password);

    try {
      await this.authRepository.createUserWithRelations({
        email: dto.email,
        passwordHash,
        username: dto.username,
        // Registration does not collect a display name, so it starts as the
        // username (docs/02-domain/profile.md §5).
        displayName: dto.username,
        language: dto.preferredLanguage ?? Language.ENGLISH,
      });
    } catch (error) {
      // Two concurrent registrations can both pass the checks above and race to
      // insert; the database constraint is the authoritative guard.
      throw this.toRegistrationError(error);
    }
  }

  /**
   * Authenticates a user and issues a token pair
   * (docs/04-api/authentication.md §6).
   *
   * An unknown email, a wrong password, and a soft-deleted account all produce
   * the same 401 and all perform one Argon2 verification, so neither the
   * response nor its timing reveals whether an account exists.
   */
  async login(dto: LoginDto): Promise<TokenPair> {
    const user = await this.authRepository.findUserForAuthentication(dto.email);

    // A deleted account must be indistinguishable from one that never existed,
    // so it is discarded before the password is checked rather than after.
    const candidate =
      user && user.accountStatus !== AccountStatus.DELETED ? user : null;

    const passwordMatches = await this.passwordUtil.verifyPassword(
      candidate?.passwordHash ?? this.decoyPasswordHash,
      dto.password,
    );

    if (!candidate || !passwordMatches) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    this.assertAccountCanLogIn(candidate.accountStatus);

    const tokens = await this.issueTokens({
      id: candidate.id,
      email: candidate.email,
      role: candidate.role,
    });

    await this.authRepository.recordSuccessfulLogin(candidate.id);

    return tokens;
  }

  /**
   * Returns the authenticated user's session summary
   * (docs/04-api/authentication.md §11).
   *
   * The record is read fresh from the database rather than reconstructed from
   * token claims, so the caller always sees current data. JwtStrategy has
   * already confirmed the account exists and is Active; the null check here
   * covers the narrow window in which the account is removed between the
   * guard's read and this one, and fails the same way.
   */
  async getCurrentUser(userId: string): Promise<CurrentUserResponse> {
    const user = await this.authRepository.findCurrentUser(userId);

    if (!user) {
      throw new UnauthorizedException();
    }

    return user;
  }

  /**
   * Applies the documented per-status login rules
   * (docs/04-api/authentication.md §6). Only Active accounts continue.
   */
  private assertAccountCanLogIn(status: AccountStatus): void {
    switch (status) {
      case AccountStatus.ACTIVE:
        return;
      case AccountStatus.PENDING_VERIFICATION:
        throw new ForbiddenException('Email not verified.');
      case AccountStatus.SUSPENDED:
        throw new ForbiddenException('Account suspended.');
      case AccountStatus.DELETED:
        // Already discarded in login(); kept so the switch stays exhaustive.
        throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }
  }

  /**
   * Signs the access and refresh tokens. Both carry the same claims, but the
   * refresh token is signed with its own secret and lifetime so a leaked
   * access secret can never mint refresh tokens
   * (docs/06-backend/authentication.md §7).
   */
  private async issueTokens(user: {
    id: string;
    email: string;
    role: UserRole;
  }): Promise<TokenPair> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    const jwt = this.configService.get('jwt', { infer: true });

    const [accessToken, refreshToken] = await Promise.all([
      // Access token uses the secret and lifetime registered on JwtModule.
      this.jwtService.signAsync(payload),
      this.jwtService.signAsync(payload, {
        secret: jwt.refreshSecret,
        expiresIn: jwt.refreshExpiresIn as SignOptions['expiresIn'],
      }),
    ]);

    return { accessToken, refreshToken };
  }

  /**
   * Rejects an email or username that is already taken
   * (docs/01-prd/authentication.md §8-9). Both are checked before hashing so a
   * doomed request never pays the Argon2 cost.
   */
  private async assertCredentialsAvailable(
    email: string,
    username: string,
  ): Promise<void> {
    const [existingUser, existingProfile] = await Promise.all([
      this.authRepository.findUserByEmail(email),
      this.authRepository.findProfileByUsername(username),
    ]);

    if (existingUser) {
      throw new ConflictException('Email already exists.');
    }

    if (existingProfile) {
      throw new ConflictException('Username already exists.');
    }
  }

  /**
   * Maps a unique constraint violation onto the documented 409 response
   * (docs/04-api/authentication.md §16). Any other error is returned unchanged
   * so the global exception filter reports it as a generic 500 — a hashing or
   * database failure must never be described to the caller
   * (docs/06-backend/security.md §15).
   */
  private toRegistrationError(error: unknown): Error {
    if (
      !(error instanceof Prisma.PrismaClientKnownRequestError) ||
      error.code !== UNIQUE_CONSTRAINT_VIOLATION
    ) {
      return error instanceof Error ? error : new Error('Registration failed.');
    }

    const target = Array.isArray(error.meta?.target)
      ? (error.meta.target as string[])
      : [];

    if (target.includes('username')) {
      return new ConflictException('Username already exists.');
    }

    if (target.includes('email')) {
      return new ConflictException('Email already exists.');
    }

    return new ConflictException('Account already exists.');
  }
}
