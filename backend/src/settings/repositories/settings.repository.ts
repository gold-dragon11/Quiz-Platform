import { Injectable } from '@nestjs/common';
import { Language, Prisma, Theme } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

/** The user preferences exposed by the Settings API (docs/04-api/users.md §11). */
export interface UserSettingsRecord {
  language: Language;
  theme: Theme;
  publicProfileEnabled: boolean;
}

/**
 * Persistence for the Settings module (docs/02-domain/user-settings.md). Owns
 * all Prisma access for user preferences: locale resolution for the content
 * APIs plus the read/write of the Settings API.
 */
@Injectable()
export class SettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findLanguageForUser(userId: string): Promise<Language | null> {
    const settings = await this.prisma.userSettings.findUnique({
      where: { userId },
      select: { language: true },
    });
    return settings?.language ?? null;
  }

  async findByUserId(userId: string): Promise<UserSettingsRecord | null> {
    return this.prisma.userSettings.findUnique({
      where: { userId },
      select: { language: true, theme: true, publicProfileEnabled: true },
    });
  }

  /**
   * Applies a partial settings update. The row is guaranteed to exist
   * (created at registration); nothing is lazily created (decision D14).
   */
  async update(
    userId: string,
    data: Prisma.UserSettingsUpdateInput,
  ): Promise<UserSettingsRecord> {
    return this.prisma.userSettings.update({
      where: { userId },
      data,
      select: { language: true, theme: true, publicProfileEnabled: true },
    });
  }
}
