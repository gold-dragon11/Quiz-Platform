import { Injectable, NotFoundException } from '@nestjs/common';
import { Language, Prisma } from '@prisma/client';
import { UpdateSettingsDto } from '../dto/update-settings.dto';
import {
  SettingsRepository,
  UserSettingsRecord,
} from '../repositories/settings.repository';

/** Fallback when no preference exists (docs/04-api/questions.md §4). */
const DEFAULT_LANGUAGE = Language.ENGLISH;

const SETTINGS_NOT_FOUND_MESSAGE = 'Settings not found.';

/**
 * Settings module service (docs/06-backend/architecture.md §6). Owns locale
 * resolution for the content APIs and the read/write of the user's
 * preferences (docs/04-api/users.md §11).
 */
@Injectable()
export class SettingsService {
  constructor(private readonly settingsRepository: SettingsRepository) {}

  /**
   * The authenticated user's preferences (docs/04-api/users.md §11,
   * decision D17). The row always exists (created at registration); a missing
   * one is an error, never lazily created (decision D14).
   */
  async getSettings(userId: string): Promise<UserSettingsRecord> {
    const settings = await this.settingsRepository.findByUserId(userId);
    if (!settings) {
      throw new NotFoundException(SETTINGS_NOT_FOUND_MESSAGE);
    }
    return settings;
  }

  /**
   * Partially updates the user's preferences (docs/04-api/users.md §11,
   * decision D9). Updating `language` takes effect immediately for
   * `resolveLocale`. Only supplied fields change.
   */
  async updateSettings(
    userId: string,
    dto: UpdateSettingsDto,
  ): Promise<UserSettingsRecord> {
    const data: Prisma.UserSettingsUpdateInput = {
      ...(dto.language === undefined ? {} : { language: dto.language }),
      ...(dto.theme === undefined ? {} : { theme: dto.theme }),
      ...(dto.publicProfileEnabled === undefined
        ? {}
        : { publicProfileEnabled: dto.publicProfileEnabled }),
    };

    try {
      return await this.settingsRepository.update(userId, data);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(SETTINGS_NOT_FOUND_MESSAGE);
      }
      throw error;
    }
  }

  /**
   * Resolves the effective content locale (docs/04-api/questions.md §4):
   * the `locale` query parameter when it names a supported language
   * (case-insensitive), otherwise the user's stored preference, otherwise
   * English. An unsupported value falls back — it is never an error.
   */
  async resolveLocale(
    requested: string | undefined,
    userId: string,
  ): Promise<Language> {
    if (requested !== undefined) {
      const match = Object.values(Language).find(
        (language) => language === requested.toUpperCase(),
      );
      if (match) {
        return match;
      }
    }

    const preference =
      await this.settingsRepository.findLanguageForUser(userId);
    return preference ?? DEFAULT_LANGUAGE;
  }
}
