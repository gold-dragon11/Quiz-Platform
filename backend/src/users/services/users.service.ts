import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AccountStatus, AvatarType, Prisma } from '@prisma/client';
import {
  isPredefinedAvatarId,
  PREDEFINED_AVATARS,
} from '../../common/constants/avatar.constants';
import { StatisticsService } from '../../statistics/services/statistics.service';
import { SelectAvatarDto } from '../dto/select-avatar.dto';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import {
  MyProfileRecord,
  UsersRepository,
} from '../repositories/users.repository';
import { AvatarView, MyProfile, PublicProfile } from '../types/users.types';

const PROFILE_NOT_FOUND_MESSAGE = 'Profile not found.';
const USERNAME_TAKEN_MESSAGE = 'This username is already taken.';
const UNKNOWN_AVATAR_MESSAGE = 'Unknown predefined avatar.';
const AVATAR_NOT_FOUND_MESSAGE = 'Avatar not found.';

/**
 * User profile and avatar use cases (docs/04-api/users.md §9-10, §12). The
 * public profile reuses StatisticsService for the progress subset — no
 * duplicated calculations (decisions D5/D20).
 */
@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly statisticsService: StatisticsService,
  ) {}

  /**
   * The authenticated user's own profile (docs/04-api/users.md §9,
   * decision D16). The row always exists (created at registration); a missing
   * one is an error, never lazily created (decision D14).
   */
  async getMyProfile(userId: string): Promise<MyProfile> {
    const profile = await this.usersRepository.findMyProfile(userId);
    if (!profile) {
      throw new NotFoundException(PROFILE_NOT_FOUND_MESSAGE);
    }
    return this.toMyProfile(profile);
  }

  /**
   * Partially updates the profile (docs/04-api/users.md §9, decision D2).
   * Username uniqueness is case-sensitive and excludes self; a duplicate is
   * 409 (decision D3). An explicit `bio: null` clears it.
   */
  async updateMyProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<MyProfile> {
    const current = await this.usersRepository.findMyProfile(userId);
    if (!current) {
      throw new NotFoundException(PROFILE_NOT_FOUND_MESSAGE);
    }

    if (dto.username !== undefined && dto.username !== current.username) {
      if (await this.usersRepository.usernameExists(dto.username, userId)) {
        throw new ConflictException(USERNAME_TAKEN_MESSAGE);
      }
    }

    const data: Prisma.ProfileUpdateInput = {
      ...(dto.displayName === undefined
        ? {}
        : { displayName: dto.displayName }),
      ...(dto.username === undefined ? {} : { username: dto.username }),
      ...(dto.bio === undefined ? {} : { bio: dto.bio }),
    };

    try {
      const updated = await this.usersRepository.updateProfile(userId, data);
      return this.toMyProfile(updated);
    } catch (error) {
      // The username unique constraint is the concurrency backstop.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(USERNAME_TAKEN_MESSAGE);
      }
      throw error;
    }
  }

  /**
   * Sets the active avatar to a predefined option (docs/04-api/users.md §10,
   * decisions D7/D18). Unknown ids are rejected; only the avatar image and
   * type change.
   */
  async selectAvatar(
    userId: string,
    dto: SelectAvatarDto,
  ): Promise<AvatarView> {
    if (!isPredefinedAvatarId(dto.predefinedAvatarId)) {
      throw new BadRequestException(UNKNOWN_AVATAR_MESSAGE);
    }
    const imageUrl = PREDEFINED_AVATARS[dto.predefinedAvatarId];

    try {
      return await this.usersRepository.updateAvatar(
        userId,
        imageUrl,
        AvatarType.PREDEFINED,
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(AVATAR_NOT_FOUND_MESSAGE);
      }
      throw error;
    }
  }

  /**
   * A user's public profile by username (docs/04-api/users.md §12,
   * decisions D4/D5/D15). Returns 404 — indistinguishably — for an unknown
   * username, a private profile, or a non-active account, so the endpoint
   * never reveals which case occurred.
   */
  async getPublicProfile(username: string): Promise<PublicProfile> {
    const record =
      await this.usersRepository.findPublicProfileByUsername(username);

    const isVisible =
      record !== null &&
      record.user.accountStatus === AccountStatus.ACTIVE &&
      record.user.settings?.publicProfileEnabled === true;
    if (!record || !isVisible) {
      throw new NotFoundException('User not found.');
    }

    const progress = await this.statisticsService.getPublicProgress(
      record.userId,
    );

    return {
      username: record.username,
      displayName: record.displayName,
      bio: record.bio,
      avatar: this.avatarView(record.user.avatar),
      registrationDate: record.createdAt.toISOString(),
      currentLevel: progress.currentLevel,
      totalXP: progress.totalXP,
      completedQuizzes: progress.completedQuizzes,
      averageAccuracy: progress.averageAccuracy,
    };
  }

  private toMyProfile(record: MyProfileRecord): MyProfile {
    return {
      username: record.username,
      displayName: record.displayName,
      email: record.user.email,
      bio: record.bio,
      avatar: this.avatarView(record.user.avatar),
      registrationDate: record.createdAt.toISOString(),
    };
  }

  /** Falls back to the default avatar if the row is somehow absent. */
  private avatarView(
    avatar: { type: AvatarType; imageUrl: string } | null,
  ): AvatarView {
    if (!avatar) {
      return {
        type: AvatarType.PREDEFINED,
        imageUrl: PREDEFINED_AVATARS.default,
      };
    }
    return { type: avatar.type, imageUrl: avatar.imageUrl };
  }
}
