import { Injectable } from '@nestjs/common';
import { SettingsService } from '../../settings/services/settings.service';
import { RecentActivityQueryDto } from '../dto/recent-activity-query.dto';
import { StatisticsLocaleQueryDto } from '../dto/statistics-locale-query.dto';
import { TopicStatisticsQueryDto } from '../dto/topic-statistics-query.dto';
import {
  StatisticsRepository,
  XpAward,
} from '../repositories/statistics.repository';
import {
  StatisticsQueryRepository,
  SubjectStatisticsRow,
  TopicStatisticsRow,
} from '../repositories/statistics-query.repository';
import {
  OverallStatistics,
  PaginatedRecentActivity,
  ProgressSummary,
  PublicProgress,
  SubjectStatistics,
  TopicStatistics,
} from '../types/statistics.types';
import { LevelService } from './level.service';
import { PrismaTransactionClient } from '../../prisma/prisma-transaction.type';

/** Read-side statistics with no completed quizzes (decision S8). */
const EMPTY_OVERALL = {
  totalQuizzes: 0,
  totalQuestions: 0,
  correctAnswers: 0,
  totalXP: 0,
  averageAccuracy: '0',
  totalLearningTimeSeconds: 0,
};

/**
 * Statistics module service (docs/06-backend/architecture.md §6). Owns the
 * quiz-completion write hook (Phase 5.1) and the read-only progress API
 * (Phase 5.2). Grouped views are computed at request time; the level is
 * derived from total XP through the pure LevelService.
 */
@Injectable()
export class StatisticsService {
  constructor(
    private readonly statisticsRepository: StatisticsRepository,
    private readonly statisticsQueryRepository: StatisticsQueryRepository,
    private readonly levelService: LevelService,
    private readonly settingsService: SettingsService,
  ) {}

  /**
   * Overall statistics (docs/04-api/statistics.md §4): exactly the documented
   * fields plus the derived level block (decisions S1/S2). Always well-formed,
   * even for a user with no completed quizzes (decision S8).
   */
  async getOverall(userId: string): Promise<OverallStatistics> {
    const stats =
      (await this.statisticsQueryRepository.findOverall(userId)) ??
      EMPTY_OVERALL;
    const level = this.levelService.progressFor(stats.totalXP);

    return {
      totalXP: stats.totalXP,
      currentLevel: level.currentLevel,
      completedQuizzes: stats.totalQuizzes,
      averageAccuracy: formatDecimal(stats.averageAccuracy),
      totalQuestions: stats.totalQuestions,
      correctAnswers: stats.correctAnswers,
      totalStudyTime: stats.totalLearningTimeSeconds,
      xpForCurrentLevel: level.xpForCurrentLevel,
      xpForNextLevel: level.xpForNextLevel,
      xpIntoLevel: level.xpIntoLevel,
      completionPercent: level.completionPercent,
    };
  }

  /**
   * The public subset of a user's progress for their public profile
   * (docs/04-api/users.md §12, Phase 5.3 decision D5): level, total XP,
   * completed quizzes, and average accuracy — nothing internal. Reuses the
   * same level and accuracy definitions as every other statistics view.
   */
  async getPublicProgress(userId: string): Promise<PublicProgress> {
    const stats =
      (await this.statisticsQueryRepository.findOverall(userId)) ??
      EMPTY_OVERALL;
    const level = this.levelService.progressFor(stats.totalXP);

    return {
      currentLevel: level.currentLevel,
      totalXP: stats.totalXP,
      completedQuizzes: stats.totalQuizzes,
      averageAccuracy: formatDecimal(stats.averageAccuracy),
    };
  }

  /**
   * High-level progress overview (docs/04-api/statistics.md §7): level, total
   * XP, and how far into the current level the user is (decision S1).
   */
  async getProgress(userId: string): Promise<ProgressSummary> {
    const stats =
      (await this.statisticsQueryRepository.findOverall(userId)) ??
      EMPTY_OVERALL;
    const level = this.levelService.progressFor(stats.totalXP);

    return {
      currentLevel: level.currentLevel,
      totalXP: stats.totalXP,
      xpForNextLevel: level.xpForNextLevel,
      xpIntoLevel: level.xpIntoLevel,
      completionPercent: level.completionPercent,
    };
  }

  /**
   * Per-subject statistics (docs/04-api/statistics.md §5), computed at request
   * time and localized (decisions S3/S9/S10). Empty when the user has
   * completed no quizzes.
   */
  async getSubjectStatistics(
    userId: string,
    query: StatisticsLocaleQueryDto,
  ): Promise<SubjectStatistics[]> {
    const locale = await this.settingsService.resolveLocale(
      query.locale,
      userId,
    );
    const rows = await this.statisticsQueryRepository.findSubjectStatistics(
      userId,
      locale,
    );
    return rows.map((row) => this.toSubjectStatistics(row));
  }

  /**
   * Per-topic statistics (docs/04-api/statistics.md §6), optionally scoped to
   * one subject (decision S4). Only topics the user has completed a quiz in.
   */
  async getTopicStatistics(
    userId: string,
    query: TopicStatisticsQueryDto,
  ): Promise<TopicStatistics[]> {
    const locale = await this.settingsService.resolveLocale(
      query.locale,
      userId,
    );
    const rows = await this.statisticsQueryRepository.findTopicStatistics(
      userId,
      locale,
      query.subjectId,
    );
    return rows.map((row) => this.toTopicStatistics(row));
  }

  /**
   * A page of recent completed sessions, newest first (docs/04-api §8,
   * decision S5).
   */
  async getRecentActivity(
    userId: string,
    query: RecentActivityQueryDto,
  ): Promise<PaginatedRecentActivity> {
    const locale = await this.settingsService.resolveLocale(
      query.locale,
      userId,
    );
    const [rows, totalItems] = await Promise.all([
      this.statisticsQueryRepository.findRecentActivity(
        userId,
        locale,
        (query.page - 1) * query.pageSize,
        query.pageSize,
      ),
      this.statisticsQueryRepository.countCompletedSessions(userId),
    ]);

    return {
      items: rows.map((row) => ({
        sessionId: row.sessionId,
        subjectId: row.subjectId,
        subjectName: row.subjectName,
        topicId: row.topicId,
        topicName: row.topicName,
        score: formatDecimal(row.score),
        accuracy: formatDecimal(row.accuracy),
        xpEarned: row.xpEarned,
        completedAt: row.completedAt.toISOString(),
      })),
      page: query.page,
      pageSize: query.pageSize,
      totalItems,
      totalPages: Math.ceil(totalItems / query.pageSize),
    };
  }

  private toSubjectStatistics(row: SubjectStatisticsRow): SubjectStatistics {
    return {
      subjectId: row.subjectId,
      subjectName: row.subjectName,
      completedQuizzes: row.completedQuizzes,
      totalQuestions: row.totalQuestions,
      averageAccuracy: accuracyOf(row.correctAnswers, row.totalQuestions),
      earnedXP: row.earnedXP,
    };
  }

  private toTopicStatistics(row: TopicStatisticsRow): TopicStatistics {
    return {
      topicId: row.topicId,
      topicName: row.topicName,
      subjectId: row.subjectId,
      subjectName: row.subjectName,
      completedQuizzes: row.completedQuizzes,
      totalQuestions: row.totalQuestions,
      averageAccuracy: accuracyOf(row.correctAnswers, row.totalQuestions),
      earnedXP: row.earnedXP,
    };
  }

  /**
   * Applies a completed quiz to the user's statistics and records its XP,
   * all within the caller's transaction (decisions D15/D17).
   */
  async applyQuizCompletion(
    tx: PrismaTransactionClient,
    params: {
      userId: string;
      quizSessionId: string;
      resultId: string;
      totalQuestions: number;
      correctAnswers: number;
      incorrectAnswers: number;
      learningTimeSeconds: number;
      awards: XpAward[];
    },
  ): Promise<void> {
    const xpEarned = params.awards.reduce(
      (sum, award) => sum + award.amount,
      0,
    );

    await this.statisticsRepository.applyCompletedQuiz(tx, {
      userId: params.userId,
      totalQuestions: params.totalQuestions,
      correctAnswers: params.correctAnswers,
      incorrectAnswers: params.incorrectAnswers,
      xpEarned,
      learningTimeSeconds: params.learningTimeSeconds,
    });

    await this.statisticsRepository.recordXpAwards(tx, {
      userId: params.userId,
      quizSessionId: params.quizSessionId,
      resultId: params.resultId,
      awards: params.awards,
    });
  }
}

/**
 * Cumulative accuracy for a group (decision S9): correct ÷ total × 100, the
 * same definition used everywhere. Two-decimal string, matching the stored
 * Decimal(5,2) presentation.
 */
function accuracyOf(correct: number, total: number): string {
  if (total <= 0) {
    return '0.00';
  }
  return ((correct / total) * 100).toFixed(2);
}

/** Presents a stored Decimal string consistently with two decimals. */
function formatDecimal(value: string): string {
  return Number(value).toFixed(2);
}
