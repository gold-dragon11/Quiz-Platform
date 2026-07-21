import { ConflictException, Injectable } from '@nestjs/common';
import { Language, Prisma } from '@prisma/client';
import { RegisterDto } from '../dto/register.dto';
import { AuthRepository } from '../repositories/auth.repository';
import { PasswordUtil } from '../utils/password.util';

/** Prisma error code raised when a unique constraint is violated. */
const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

/**
 * Authentication use cases (docs/06-backend/authentication.md §2).
 *
 * Registration is implemented here; login, token refresh, logout, email
 * verification, and password reset belong to later phases.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly passwordUtil: PasswordUtil,
  ) {}

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
