import { Module } from '@nestjs/common';
import { SettingsRepository } from './repositories/settings.repository';
import { SettingsService } from './services/settings.service';

/**
 * Settings module (docs/06-backend/architecture.md §6). Minimal for now —
 * it owns user preferences and serves locale resolution to the public
 * content API. Preference endpoints arrive in the User Profile phase.
 */
@Module({
  providers: [SettingsService, SettingsRepository],
  exports: [SettingsService],
})
export class SettingsModule {}
