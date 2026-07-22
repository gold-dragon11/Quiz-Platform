import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AccountStatus, Language, Prisma, UserRole } from '@prisma/client';
import { randomBytes, randomUUID } from 'node:crypto';
import type { SignOptions } from 'jsonwebtoken';
import { AppConfig } from '../../config/configuration';
import { EmailService } from '../../email/email.service';
import { EMAIL_VERIFICATION_PURPOSE } from '../constants/auth.constants';
import { LoginDto } from '../dto/login.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { RegisterDto } from '../dto/register.dto';
import { ResendVerificationDto } from '../dto/resend-verification.dto';
import { VerifyEmailDto } from '../dto/verify-email.dto';
import {
  EmailVerificationPayload,
  JwtPayload,
  RefreshTokenPayload,
} from '../interfaces/jwt-payload.interface';
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
 * The single response for every failed verification attempt — invalid,
 * expired, malformed, wrong-purpose, unknown user, or an account not awaiting
 * verification — so no failure mode is distinguishable from another
 * (docs/04-api/authentication.md §5).
 */
const INVALID_VERIFICATION_TOKEN_MESSAGE =
  'Invalid or expired verification token.';

/**
 * Authentication use cases (docs/06-backend/authentication.md §2).
 *
 * Registration, login, token refresh, and logout are implemented here; email
 * verification and password reset belong to later phases.
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

  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly authRepository: AuthRepository,
    private readonly passwordUtil: PasswordUtil,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<AppConfig, true>,
    private readonly emailService: EmailService,
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

    let createdUser: { id: string };

    try {
      createdUser = await this.authRepository.createUserWithRelations({
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

    // The verification email is dispatched only after the registration has
    // committed, and a delivery failure never rolls it back — the resend
    // endpoint is the documented recovery path
    // (docs/06-backend/authentication.md §8).
    await this.sendVerificationEmailSafely(createdUser.id, dto.email);
  }

  /**
   * Activates the account identified by a valid verification token
   * (docs/04-api/authentication.md §5). Every failure returns the same
   * generic 400 so no failure mode is distinguishable from another.
   */
  async verifyEmail(dto: VerifyEmailDto): Promise<void> {
    const payload = await this.verifyEmailVerificationToken(dto.token);

    if (!payload) {
      throw new BadRequestException(INVALID_VERIFICATION_TOKEN_MESSAGE);
    }

    const activated = await this.authRepository.activateAccountIfPending(
      payload.sub,
    );

    if (!activated) {
      throw new BadRequestException(INVALID_VERIFICATION_TOKEN_MESSAGE);
    }
  }

  /**
   * Issues a fresh verification token and re-sends the email
   * (docs/04-api/authentication.md §5).
   *
   * Always resolves so the endpoint answers 202 regardless of whether the
   * email exists, is pending, or is already verified — it cannot be used to
   * discover which addresses are registered. An email is actually sent only
   * for accounts still awaiting verification.
   */
  async resendVerification(dto: ResendVerificationDto): Promise<void> {
    const user = await this.authRepository.findUserStatusByEmail(dto.email);

    if (!user || user.accountStatus !== AccountStatus.PENDING_VERIFICATION) {
      return;
    }

    await this.sendVerificationEmailSafely(user.id, user.email);
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
   * Exchanges a valid refresh token for a new token pair
   * (docs/04-api/authentication.md §8).
   *
   * Rotation is enforced through an atomic compare-and-swap on the session
   * row: exactly one caller can rotate a given token. Presenting a token whose
   * session is already revoked — whether by earlier rotation, logout, or a
   * concurrent request — is treated as evidence of theft, and every active
   * session the user holds is revoked.
   *
   * Every failure path returns the same bare 401 so the endpoint reveals
   * nothing about why a token was rejected.
   */
  async refresh(dto: RefreshTokenDto): Promise<TokenPair> {
    const payload = await this.verifyRefreshToken(dto.refreshToken);

    if (!payload) {
      throw new UnauthorizedException();
    }

    const session = await this.authRepository.findRefreshTokenById(payload.jti);

    if (!session || session.userId !== payload.sub) {
      throw new UnauthorizedException();
    }

    // The stored Argon2 hash must match the presented token — a database leak
    // alone can never produce a usable refresh token
    // (docs/06-backend/security.md §5).
    const tokenMatchesStoredHash = await this.passwordUtil.verifyPassword(
      session.tokenHash,
      dto.refreshToken,
    );

    if (!tokenMatchesStoredHash || session.expiresAt <= new Date()) {
      throw new UnauthorizedException();
    }

    const rotatedByThisCall =
      await this.authRepository.revokeRefreshTokenIfActive(session.id);

    if (!rotatedByThisCall) {
      // Reuse detection (docs/04-api/authentication.md §8): the token was
      // already spent, so someone is replaying it. Kill every active session.
      await this.authRepository.revokeAllRefreshTokensForUser(session.userId);
      throw new UnauthorizedException();
    }

    const account = await this.authRepository.findAccountForAuthorization(
      payload.sub,
    );

    if (!account || account.accountStatus !== AccountStatus.ACTIVE) {
      throw new UnauthorizedException();
    }

    return this.issueTokens(account);
  }

  /**
   * Invalidates the presented refresh token (docs/04-api/authentication.md §7).
   *
   * Idempotent by design: an unknown, malformed, expired, or already-revoked
   * token is silently ignored, so logout always succeeds and can never be used
   * to probe token validity. Access tokens are untouched and expire naturally.
   */
  async logout(dto: RefreshTokenDto): Promise<void> {
    const payload = await this.verifyRefreshToken(dto.refreshToken);

    if (!payload) {
      return;
    }

    const session = await this.authRepository.findRefreshTokenById(payload.jti);

    if (!session || session.userId !== payload.sub) {
      return;
    }

    const tokenMatchesStoredHash = await this.passwordUtil.verifyPassword(
      session.tokenHash,
      dto.refreshToken,
    );

    if (!tokenMatchesStoredHash) {
      return;
    }

    await this.authRepository.revokeRefreshTokenIfActive(session.id);
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
   * Signs the access and refresh tokens and persists the refresh session.
   *
   * The refresh token is signed with its own secret and lifetime so a leaked
   * access secret can never mint refresh tokens
   * (docs/06-backend/authentication.md §7). It additionally carries a `jti`
   * identifying its session row; access tokens never do. Only the Argon2 hash
   * of the refresh token is stored (docs/06-backend/security.md §5).
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
    const sessionId = randomUUID();
    const refreshPayload: RefreshTokenPayload = { ...payload, jti: sessionId };

    const [accessToken, refreshToken] = await Promise.all([
      // Access token uses the secret and lifetime registered on JwtModule.
      this.jwtService.signAsync(payload),
      this.jwtService.signAsync(refreshPayload, {
        secret: jwt.refreshSecret,
        expiresIn: jwt.refreshExpiresIn as SignOptions['expiresIn'],
      }),
    ]);

    // The session row mirrors the token's own exp claim so the database and
    // the JWT can never disagree about the expiration time.
    const { exp } = this.jwtService.decode<{ exp: number }>(refreshToken);
    const tokenHash = await this.passwordUtil.hashPassword(refreshToken);

    await this.authRepository.createRefreshTokenSession({
      id: sessionId,
      userId: user.id,
      tokenHash,
      expiresAt: new Date(exp * 1000),
    });

    return { accessToken, refreshToken };
  }

  /**
   * Builds the verification link, signs the token, and dispatches the email.
   * Failures are logged (without the token) and swallowed: neither
   * registration nor resend may fail because delivery did
   * (docs/06-backend/authentication.md §8).
   */
  private async sendVerificationEmailSafely(
    userId: string,
    email: string,
  ): Promise<void> {
    try {
      const { secret, expiresIn } = this.configService.get(
        'emailVerification',
        {
          infer: true,
        },
      );
      const frontendUrl = this.configService.get('frontendUrl', {
        infer: true,
      });

      const payload: EmailVerificationPayload = {
        sub: userId,
        purpose: EMAIL_VERIFICATION_PURPOSE,
      };

      const token = await this.jwtService.signAsync(payload, {
        secret,
        expiresIn: expiresIn as SignOptions['expiresIn'],
      });

      const verificationUrl = `${frontendUrl}/verify-email?token=${token}`;

      await this.emailService.sendVerificationEmail(email, verificationUrl);
    } catch (error) {
      // Never include the token or link here (docs/06-backend/security.md §13).
      this.logger.error(
        `Failed to send verification email to user ${userId}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  /**
   * Verifies an email verification token's signature, expiry, and purpose
   * claim against the dedicated verification secret. Returns null on any
   * failure so the caller answers with the single generic error.
   */
  private async verifyEmailVerificationToken(
    token: string,
  ): Promise<EmailVerificationPayload | null> {
    const { secret } = this.configService.get('emailVerification', {
      infer: true,
    });

    try {
      const payload =
        await this.jwtService.verifyAsync<EmailVerificationPayload>(token, {
          secret,
        });

      return payload.sub && payload.purpose === EMAIL_VERIFICATION_PURPOSE
        ? payload
        : null;
    } catch {
      return null;
    }
  }

  /**
   * Verifies a presented refresh token's signature, expiry, and claim shape
   * against the refresh secret. Returns null instead of throwing so callers
   * decide the failure mode — refresh answers 401, logout stays idempotent.
   */
  private async verifyRefreshToken(
    token: string,
  ): Promise<RefreshTokenPayload | null> {
    const jwt = this.configService.get('jwt', { infer: true });

    try {
      const payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(
        token,
        { secret: jwt.refreshSecret },
      );

      return payload.sub && payload.jti ? payload : null;
    } catch {
      return null;
    }
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
