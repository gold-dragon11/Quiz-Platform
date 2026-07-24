import { Injectable } from '@nestjs/common';
import { AccountStatus, AvatarType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

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
}
