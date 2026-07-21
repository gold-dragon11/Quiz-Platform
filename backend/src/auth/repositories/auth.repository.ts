import { Injectable } from '@nestjs/common';
import {
  AccountStatus,
  AvatarType,
  Language,
  Theme,
  UserRole,
} from '@prisma/client';
import { DEFAULT_AVATAR_URL } from '../../common/constants/avatar.constants';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * The columns login needs. Deliberately narrow — nothing beyond what
 * authentication and token issuance require is read.
 */
export interface AuthenticationCandidate {
  id: string;
  email: string;
  role: UserRole;
  accountStatus: AccountStatus;
  passwordHash: string;
}

/**
 * The account state a guarded request needs in order to decide whether the
 * bearer is still allowed in. Carries no credentials.
 */
export interface AuthorizedAccount {
  id: string;
  email: string;
  role: UserRole;
  accountStatus: AccountStatus;
}

/**
 * The session summary returned by GET /auth/me
 * (docs/04-api/authentication.md §11). `passwordHash` is never part of this
 * shape, so it cannot leak through the endpoint.
 */
export interface CurrentUserRecord {
  id: string;
  email: string;
  role: UserRole;
  accountStatus: AccountStatus;
  emailVerified: boolean;
  createdAt: Date;
  profile: {
    username: string;
    displayName: string;
    bio: string | null;
  } | null;
  avatar: {
    type: AvatarType;
    imageUrl: string;
  } | null;
  settings: {
    language: Language;
    theme: Theme;
    publicProfileEnabled: boolean;
  } | null;
}

/** Values needed to persist a new account and its owned records. */
export interface CreateUserWithRelationsParams {
  email: string;
  passwordHash: string;
  username: string;
  displayName: string;
  language: Language;
}

/**
 * Data access for the Authentication module
 * (docs/06-backend/architecture.md §7 — all database access goes through
 * repositories). Contains no business decisions; those belong to AuthService.
 */
@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findUserByEmail(email: string): Promise<{ id: string } | null> {
    return this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
  }

  async findProfileByUsername(
    username: string,
  ): Promise<{ id: string } | null> {
    return this.prisma.profile.findUnique({
      where: { username },
      select: { id: true },
    });
  }

  /**
   * Loads the credentials and account state needed to authenticate a login
   * attempt. Never selects columns the caller does not need.
   */
  async findUserForAuthentication(
    email: string,
  ): Promise<AuthenticationCandidate | null> {
    return this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        role: true,
        accountStatus: true,
        passwordHash: true,
      },
    });
  }

  /**
   * Loads the account state needed to authorize an already-authenticated
   * request. Selects no credentials — only what the guard must decide on.
   */
  async findAccountForAuthorization(
    userId: string,
  ): Promise<AuthorizedAccount | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        accountStatus: true,
      },
    });
  }

  /**
   * Loads the full session summary for GET /auth/me — the account plus the
   * records it owns that the interface needs (docs/04-api/authentication.md
   * §11). Statistics are deliberately excluded; they belong to the Statistics
   * API. `passwordHash` is never selected.
   */
  async findCurrentUser(userId: string): Promise<CurrentUserRecord | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        accountStatus: true,
        emailVerified: true,
        createdAt: true,
        profile: {
          select: { username: true, displayName: true, bio: true },
        },
        avatar: {
          select: { type: true, imageUrl: true },
        },
        settings: {
          select: {
            language: true,
            theme: true,
            publicProfileEnabled: true,
          },
        },
      },
    });
  }

  /** Records the moment of a successful login (docs/02-domain/user.md §4). */
  async recordSuccessfulLogin(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  }

  /**
   * Creates the User together with the four records every account must own —
   * Profile, Avatar, UserSettings, and Statistics
   * (docs/01-prd/authentication.md §3).
   *
   * Wrapped in a single interactive transaction so a failure at any step rolls
   * the whole registration back and leaves no partial account behind
   * (docs/06-backend/architecture.md §10).
   *
   * Statistics counters and the remaining columns rely on the defaults declared
   * in the Prisma schema, which mirror the documented domain defaults.
   */
  async createUserWithRelations(
    params: CreateUserWithRelationsParams,
  ): Promise<{ id: string }> {
    const { email, passwordHash, username, displayName, language } = params;

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email, passwordHash },
        select: { id: true },
      });

      await tx.profile.create({
        data: { userId: user.id, username, displayName },
      });

      await tx.avatar.create({
        data: {
          userId: user.id,
          type: AvatarType.PREDEFINED,
          imageUrl: DEFAULT_AVATAR_URL,
        },
      });

      await tx.userSettings.create({
        data: { userId: user.id, language },
      });

      await tx.statistics.create({
        data: { userId: user.id },
      });

      return user;
    });
  }
}
