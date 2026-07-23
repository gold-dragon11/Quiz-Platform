import { Module } from '@nestjs/common';
import { SettingsModule } from '../settings/settings.module';
import { StatisticsController } from './controllers/statistics.controller';
import { StatisticsQueryRepository } from './repositories/statistics-query.repository';
import { StatisticsRepository } from './repositories/statistics.repository';
import { LevelService } from './services/level.service';
import { StatisticsService } from './services/statistics.service';

/**
 * Statistics module (docs/06-backend/architecture.md §6). Owns the Statistics
 * write hook consumed by the Quiz engine (Phase 5.1) and the read-only
 * progress API (Phase 5.2). Depends on Settings for locale resolution.
 */
@Module({
  imports: [SettingsModule],
  controllers: [StatisticsController],
  providers: [
    StatisticsService,
    StatisticsRepository,
    StatisticsQueryRepository,
    LevelService,
  ],
  exports: [StatisticsService],
})
export class StatisticsModule {}
