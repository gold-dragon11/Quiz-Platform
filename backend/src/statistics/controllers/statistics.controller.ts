import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RecentActivityQueryDto } from '../dto/recent-activity-query.dto';
import { StatisticsLocaleQueryDto } from '../dto/statistics-locale-query.dto';
import { TopicStatisticsQueryDto } from '../dto/topic-statistics-query.dto';
import { StatisticsService } from '../services/statistics.service';
import {
  OverallStatistics,
  PaginatedRecentActivity,
  ProgressSummary,
  SubjectStatistics,
  TopicStatistics,
} from '../types/statistics.types';

/**
 * Read-only statistics endpoints (docs/04-api/statistics.md). All require
 * authentication and operate solely on the authenticated user — there is no
 * cross-user access (decision S7). Trends are deferred (decision S6).
 */
@UseGuards(JwtAuthGuard)
@Controller('statistics')
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  /** GET /api/v1/statistics — overall learning statistics with level. */
  @Get()
  async getOverall(
    @CurrentUser('id') userId: string,
  ): Promise<OverallStatistics> {
    return this.statisticsService.getOverall(userId);
  }

  /** GET /api/v1/statistics/progress — level and XP-to-next overview. */
  @Get('progress')
  async getProgress(
    @CurrentUser('id') userId: string,
  ): Promise<ProgressSummary> {
    return this.statisticsService.getProgress(userId);
  }

  /** GET /api/v1/statistics/subjects — statistics grouped by subject. */
  @Get('subjects')
  async getSubjects(
    @CurrentUser('id') userId: string,
    @Query() query: StatisticsLocaleQueryDto,
  ): Promise<SubjectStatistics[]> {
    return this.statisticsService.getSubjectStatistics(userId, query);
  }

  /** GET /api/v1/statistics/topics — statistics grouped by topic. */
  @Get('topics')
  async getTopics(
    @CurrentUser('id') userId: string,
    @Query() query: TopicStatisticsQueryDto,
  ): Promise<TopicStatistics[]> {
    return this.statisticsService.getTopicStatistics(userId, query);
  }

  /** GET /api/v1/statistics/recent — paginated recent completed quizzes. */
  @Get('recent')
  async getRecent(
    @CurrentUser('id') userId: string,
    @Query() query: RecentActivityQueryDto,
  ): Promise<PaginatedRecentActivity> {
    return this.statisticsService.getRecentActivity(userId, query);
  }
}
