import { Injectable } from '@nestjs/common';
import { Language } from '@prisma/client';
import { SettingsRepository } from '../repositories/settings.repository';

/** Fallback when no preference exists (docs/04-api/questions.md §4). */
const DEFAULT_LANGUAGE = Language.ENGLISH;

/**
 * Settings module service (docs/06-backend/architecture.md §6). This phase
 * exposes only what the public content API needs: resolving the locale a
 * request should be served in. Preference management endpoints arrive in the
 * User Profile phase.
 */
@Injectable()
export class SettingsService {
  constructor(private readonly settingsRepository: SettingsRepository) {}

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
