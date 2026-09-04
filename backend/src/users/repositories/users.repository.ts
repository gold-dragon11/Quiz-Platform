import { Injectable } from '@nestjs/common';
import { AccountStatus, AvatarType, Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

/** One account as an administrator sees it in the directory. */
export interface AdminUserRecord {
  id: string;
  email: string;
  role: UserRole;
  accountStatus: AccountStatus;
  createdAt: Date;
  username: string | null;
  displayName: string | null;
}

/** The authenticated user's profile with account email and avatar. */
export interface MyProfileRecord {
  username: string;
  displayName: string;
  bio: string | null;
  createdAt: Date;
  user: {
    email: string;
    avatar: { type: AvatarType; imageUrl: string } | null;
  };
}

/** The authenticated user's account fields (docs/04-api/users.md §4). */
export interface AccountRecord {
  id: string;
  email: string;
  accountStatus: AccountStatus;
  emailVerified: boolean;
  createdAt: Date;
}

/** A public profile lookup joined with account status and privacy. */
export interface PublicProfileRecord {
  userId: string;
  username: string;
  displayName: string;
  bio: string | null;
  createdAt: Date;
  user: {
    accountStatus: AccountStatus;
    avatar: { type: AvatarType; imageUrl: string } | null;
    settings: { publicProfileEnabled: boolean } | null;
  };
}

/**
 * Persistence for the Users module (profile and avatar). Owns all Prisma
 * access for these entities; the module reaches other domains (statistics)
 * only through their public services.
 */
@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** The user's account fields (docs/04-api/users.md §4). */
  async findAccount(userId: string): Promise<AccountRecord | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        accountStatus: true,
        emailVerified: true,
        createdAt: true,
      },
    });
  }

  /** The user's active avatar (docs/04-api/users.md §10). */
  async findAvatar(
    userId: string,
  ): Promise<{ type: AvatarType; imageUrl: string } | null> {
    return this.prisma.avatar.findUnique({
      where: { userId },
      select: { type: true, imageUrl: true },
    });
  }

  /** The user's own profile plus email and avatar — one query, no N+1. */
  async findMyProfile(userId: string): Promise<MyProfileRecord | null> {
    return this.prisma.profile.findUnique({
      where: { userId },
      select: {
        username: true,
        displayName: true,
        bio: true,
        createdAt: true,
        user: {
          select: {
            email: true,
            avatar: { select: { type: true, imageUrl: true } },
          },
        },
      },
    });
  }

  /**
   * Whether a profile with this exact username exists, optionally excluding
   * one user (self). Case-sensitive, matching the DB unique constraint
   * (decision D3).
   */
  async usernameExists(
    username: string,
    excludeUserId?: string,
  ): Promise<boolean> {
    const existing = await this.prisma.profile.findFirst({
      where: {
        username,
        ...(excludeUserId ? { userId: { not: excludeUserId } } : {}),
      },
      select: { id: true },
    });
    return existing !== null;
  }

  async updateProfile(
    userId: string,
    data: Prisma.ProfileUpdateInput,
  ): Promise<MyProfileRecord> {
    return this.prisma.profile.update({
      where: { userId },
      data,
      select: {
        username: true,
        displayName: true,
        bio: true,
        createdAt: true,
        user: {
          select: {
            email: true,
            avatar: { select: { type: true, imageUrl: true } },
          },
        },
      },
    });
  }

  /** Sets the active avatar image and type (decision D18). */
  async updateAvatar(
    userId: string,
    imageUrl: string,
    type: AvatarType,
  ): Promise<{ type: AvatarType; imageUrl: string }> {
    return this.prisma.avatar.update({
      where: { userId },
      data: { imageUrl, type },
      select: { type: true, imageUrl: true },
    });
  }

  /**
   * A public profile lookup by username, carrying the account status, privacy
   * flag, and avatar so the service can gate visibility in one query
   * (decision D20).
   */
  async findPublicProfileByUsername(
    username: string,
  ): Promise<PublicProfileRecord | null> {
    return this.prisma.profile.findUnique({
      where: { username },
      select: {
        userId: true,
        username: true,
        displayName: true,
        bio: true,
        createdAt: true,
        user: {
          select: {
            accountStatus: true,
            avatar: { select: { type: true, imageUrl: true } },
            settings: { select: { publicProfileEnabled: true } },
          },
        },
      },
    });
  }

  // ------------------------------------------------------ administration

  /**
   * The directory an administrator searches when deciding who becomes a
   * teacher. Deleted accounts are excluded: a role on an account nobody can
   * sign into is not a decision worth offering.
   */
  async listForAdmin(params: {
    page: number;
    pageSize: number;
    search?: string;
    role?: UserRole;
  }): Promise<{ items: AdminUserRecord[]; total: number }> {
    const where: Prisma.UserWhereInput = {
      accountStatus: { not: AccountStatus.DELETED },
      ...(params.role ? { role: params.role } : {}),
      ...(params.search
        ? {
            OR: [
              { email: { contains: params.search, mode: 'insensitive' } },
              {
                profile: {
                  username: { contains: params.search, mode: 'insensitive' },
                },
              },
              {
                profile: {
                  displayName: {
                    contains: params.search,
                    mode: 'insensitive',
                  },
                },
              },
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
        select: {
          id: true,
          email: true,
          role: true,
          accountStatus: true,
          createdAt: true,
          profile: { select: { username: true, displayName: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items: rows.map((row) => ({
        id: row.id,
        email: row.email,
        role: row.role,
        accountStatus: row.accountStatus,
        createdAt: row.createdAt,
        username: row.profile?.username ?? null,
        displayName: row.profile?.displayName ?? null,
      })),
      total,
    };
  }

  /** The role and status of one account, for the role-change checks. */
  async findRole(userId: string): Promise<{
    id: string;
    role: UserRole;
    accountStatus: AccountStatus;
  } | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, accountStatus: true },
    });
  }

  async updateRole(userId: string, role: UserRole): Promise<AdminUserRecord> {
    const row = await this.prisma.user.update({
      where: { id: userId },
      data: { role },
      select: {
        id: true,
        email: true,
        role: true,
        accountStatus: true,
        createdAt: true,
        profile: { select: { username: true, displayName: true } },
      },
    });

    return {
      id: row.id,
      email: row.email,
      role: row.role,
      accountStatus: row.accountStatus,
      createdAt: row.createdAt,
      username: row.profile?.username ?? null,
      displayName: row.profile?.displayName ?? null,
    };
  }
}
