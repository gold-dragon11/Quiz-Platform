import { Injectable } from '@nestjs/common';
import { SettingsService } from '../../settings/services/settings.service';
import { RecentActivityQueryDto } from '../dto/recent-activity-query.dto';
import { StatisticsLocaleQueryDto } from '../dto/statistics-locale-query.dto';
import { TopicStatisticsQueryDto } from '../dto/topic-statistics-query.dto';
import { StatisticsRepository } from '../repositories/statistics.repository';
import {
  StatisticsQueryRepository,
  SubjectStatisticsRow,
  TopicMasteryRow,
  TopicStatisticsRow,
} from '../repositories/statistics-query.repository';
import {
  MistakeGroup,
  OverallStatistics,
  PaginatedRecentActivity,
  Progress,
  PublicProgress,
  SubjectStatistics,
  TopicState,
  TopicStatistics,
} from '../types/statistics.types';
import { PrismaTransactionClient } from '../../prisma/prisma-transaction.type';

/** Read-side statistics with no completed quizzes (decision S8). */
const EMPTY_OVERALL = {
  totalQuizzes: 0,
  totalQuestions: 0,
  correctAnswers: 0,
  averageAccuracy: '0',
  totalLearningTimeSeconds: 0,
};

/** How many of a topic's latest answers decide whether it is mastered. */
export const MASTERY_WINDOW = 10;
/** The share of those answers that must be right, in per cent. */
export const MASTERY_ACCURACY = 80;

/**
 * Statistics module service (docs/06-backend/architecture.md §6). Owns the
 * quiz-completion write hook (Phase 5.1) and the read-only progress API
 * (Phase 5.2). Grouped views are computed at request time.
 */
@Injectable()
export class StatisticsService {
  constructor(
    private readonly statisticsRepository: StatisticsRepository,
    private readonly statisticsQueryRepository: StatisticsQueryRepository,
    private readonly settingsService: SettingsService,
  ) {}

  /**
   * Overall statistics (docs/04-api/statistics.md §4). Always well-formed,
   * even for a user with no completed quizzes (decision S8).
   */
  async getOverall(userId: string): Promise<OverallStatistics> {
    const stats =
      (await this.statisticsQueryRepository.findOverall(userId)) ??
      EMPTY_OVERALL;

    return {
      completedQuizzes: stats.totalQuizzes,
      averageAccuracy: formatDecimal(stats.averageAccuracy),
      totalQuestions: stats.totalQuestions,
      correctAnswers: stats.correctAnswers,
      totalStudyTime: stats.totalLearningTimeSeconds,
    };
  }

  /**
   * The public subset of a user's progress for their public profile
   * (docs/04-api/users.md §12, Phase 5.3 decision D5): topics mastered,
   * mistakes fixed, completed quizzes and average accuracy — nothing internal.
   */
  async getPublicProgress(userId: string): Promise<PublicProgress> {
    const [stats, mastery, mistakesFixed] = await Promise.all([
      this.statisticsQueryRepository.findOverall(userId),
      this.statisticsQueryRepository.findTopicMastery(userId, MASTERY_WINDOW),
      this.statisticsQueryRepository.countFixedMistakes(userId),
    ]);
    const overall = stats ?? EMPTY_OVERALL;

    return {
      masteredTopics: mastery.filter((row) => stateOf(row) === 'MASTERED')
        .length,
      mistakesFixed,
      completedQuizzes: overall.totalQuizzes,
      averageAccuracy: formatDecimal(overall.averageAccuracy),
    };
  }

  /**
   * What the learner has actually learned (docs/04-api/statistics.md §7,
   * decision 46). A topic is mastered when its last ten answers are at least
   * 80% right and none of its questions waits on the mistake ladder; ten,
   * because a topic is not known from three lucky answers, and the ladder,
   * because a question still being re-asked is by definition not known yet.
   */
  async getProgress(
    userId: string,
    query: StatisticsLocaleQueryDto,
  ): Promise<Progress> {
    const locale = await this.settingsService.resolveLocale(
      query.locale,
      userId,
    );
    const [subjects, mastery, mistakesFixed] = await Promise.all([
      this.statisticsQueryRepository.findSubjectTopicCounts(locale),
      this.statisticsQueryRepository.findTopicMastery(userId, MASTERY_WINDOW),
      this.statisticsQueryRepository.countFixedMistakes(userId),
    ]);

    const topics = mastery.map((row) => ({
      topicId: row.topicId,
      subjectId: row.subjectId,
      state: stateOf(row),
      recentAnswers: row.recentAnswers,
      recentCorrect: row.recentCorrect,
    }));

    return {
      subjects: subjects.map((subject) => {
        const own = topics.filter(
          (topic) => topic.subjectId === subject.subjectId,
        );
        const mastered = own.filter(
          (topic) => topic.state === 'MASTERED',
        ).length;
        return {
          subjectId: subject.subjectId,
          subjectName: subject.subjectName,
          topicsTotal: subject.topicsTotal,
          mastered,
          inProgress: own.length - mastered,
        };
      }),
      topics: topics.map((topic) => ({
        topicId: topic.topicId,
        state: topic.state,
        recentAnswers: topic.recentAnswers,
        recentCorrect: topic.recentCorrect,
      })),
      mistakesFixed,
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
   * Topics the reader still gets wrong, most mistakes first
   * (docs/04-api/statistics.md §8a). Each entry's `mistakeCount` is exactly
   * how many questions a practice quiz over that topic would draw from.
   */
  async getMistakes(
    userId: string,
    query: StatisticsLocaleQueryDto,
  ): Promise<MistakeGroup[]> {
    const locale = await this.settingsService.resolveLocale(
      query.locale,
      userId,
    );
    const rows = await this.statisticsQueryRepository.findMistakeGroups(
      userId,
      locale,
    );
    return rows.map((row) => ({
      subjectId: row.subjectId,
      subjectName: row.subjectName,
      topicId: row.topicId,
      topicName: row.topicName,
      mistakeCount: row.mistakeCount,
      lastMistakeAt: row.lastMistakeAt.toISOString(),
    }));
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
    };
  }

  /**
   * Applies a completed quiz to the user's statistics, within the caller's
   * transaction (decisions D15/D17). No XP any more (decision 46): the totals
   * it keeps are the ones a learner can read meaning into.
   */
  async applyQuizCompletion(
    tx: PrismaTransactionClient,
    params: {
      userId: string;
      totalQuestions: number;
      correctAnswers: number;
      incorrectAnswers: number;
      learningTimeSeconds: number;
    },
  ): Promise<void> {
    await this.statisticsRepository.applyCompletedQuiz(tx, params);
  }
}

/** A topic's state under the mastery rule (decision 46). */
function stateOf(row: TopicMasteryRow): TopicState {
  const accurate =
    row.recentAnswers >= MASTERY_WINDOW &&
    row.recentCorrect * 100 >= row.recentAnswers * MASTERY_ACCURACY;
  return accurate && row.openMistakes === 0 ? 'MASTERED' : 'IN_PROGRESS';
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
