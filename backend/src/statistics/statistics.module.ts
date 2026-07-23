import { Module } from '@nestjs/common';
import { StatisticsRepository } from './repositories/statistics.repository';
import { StatisticsService } from './services/statistics.service';

/**
 * Statistics module (docs/06-backend/architecture.md §6). Minimal for now — it
 * owns Statistics and XP persistence and serves the Quiz engine's completion
 * hook. Read endpoints (level, progress, trends) arrive in the Statistics
 * phase (decision D16).
 */
@Module({
  providers: [StatisticsService, StatisticsRepository],
  exports: [StatisticsService],
})
export class StatisticsModule {}
