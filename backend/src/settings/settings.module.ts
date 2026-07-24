import { Module } from '@nestjs/common';
import { SettingsController } from './controllers/settings.controller';
import { SettingsRepository } from './repositories/settings.repository';
import { SettingsService } from './services/settings.service';

/**
 * Settings module (docs/06-backend/architecture.md §6). Owns user preferences:
 * locale resolution for the content APIs and the read/write Settings API
 * (docs/04-api/users.md §11).
 */
@Module({
  controllers: [SettingsController],
  providers: [SettingsService, SettingsRepository],
  exports: [SettingsService],
})
export class SettingsModule {}
