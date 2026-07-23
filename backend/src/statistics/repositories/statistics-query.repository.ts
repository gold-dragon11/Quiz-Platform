import { Injectable } from '@nestjs/common';
import { Language, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

/** The stored aggregate row for a user (docs/02-domain/statistics.md §4). */
export interface OverallStatisticsRow {
  totalQuizzes: number;
  totalQuestions: number;
  correctAnswers: number;
  totalXP: number;
  averageAccuracy: string;
  totalLearningTimeSeconds: number;
}

/** One subject's aggregated learning stats (docs/04-api/statistics.md §5). */
export interface SubjectStatisticsRow {
  subjectId: string;
  subjectName: string;
  completedQuizzes: number;
  totalQuestions: number;
  correctAnswers: number;
  earnedXP: number;
}

/** One topic's aggregated learning stats (docs/04-api/statistics.md §6). */
export interface TopicStatisticsRow {
  topicId: string;
  topicName: string;
  subjectId: string;
  subjectName: string;
  completedQuizzes: number;
  totalQuestions: number;
  correctAnswers: number;
  earnedXP: number;
}

/** One recent completed session (docs/04-api/statistics.md §8). */
export interface RecentActivityRow {
  sessionId: string;
  subjectId: string;
  subjectName: string;
  topicId: string | null;
  topicName: string | null;
  score: string;
  accuracy: string;
  xpEarned: number;
  completedAt: Date;
}

/**
 * Read-only persistence for the Statistics API (docs/04-api/statistics.md).
 * Grouped views are computed at request time from completed Quiz Sessions and
 * their Results (decision S3) — no precomputed subject/topic tables. Subject
 * and topic names are localized with fallback (decision S10). Owns all Prisma
 * access for the read side.
 */
@Injectable()
export class StatisticsQueryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findOverall(userId: string): Promise<OverallStatisticsRow | null> {
    const stats = await this.prisma.statistics.findUnique({
      where: { userId },
      select: {
        totalQuizzes: true,
        totalQuestions: true,
        correctAnswers: true,
        totalXP: true,
        averageAccuracy: true,
        totalLearningTimeSeconds: true,
      },
    });
    if (!stats) {
      return null;
    }
    return { ...stats, averageAccuracy: stats.averageAccuracy.toString() };
  }

  /**
   * Aggregates completed sessions per subject, localized. Only subjects the
   * user has completed at least one quiz in appear.
   */
  async findSubjectStatistics(
    userId: string,
    locale: Language,
  ): Promise<SubjectStatisticsRow[]> {
    return this.prisma.$queryRaw<SubjectStatisticsRow[]>(Prisma.sql`
      SELECT
        s.id AS "subjectId",
        COALESCE(st.name, s.name) AS "subjectName",
        COUNT(DISTINCT qs.id)::int AS "completedQuizzes",
        COALESCE(SUM(r."totalQuestions"), 0)::int AS "totalQuestions",
        COALESCE(SUM(r."correctAnswers"), 0)::int AS "correctAnswers",
        COALESCE(xp.earned, 0)::int AS "earnedXP"
      FROM quiz_sessions qs
      JOIN results r ON r."quizSessionId" = qs.id
      JOIN subjects s ON s.id = qs."subjectId"
      LEFT JOIN subject_translations st
        ON st."subjectId" = s.id AND st.locale = ${locale}::"Language"
      LEFT JOIN (
        SELECT qs2."subjectId" AS sid, SUM(x.amount) AS earned
        FROM xp_transactions x
        JOIN quiz_sessions qs2 ON qs2.id = x."quizSessionId"
        WHERE x."userId" = ${userId}::uuid AND qs2.status = 'COMPLETED'
        GROUP BY qs2."subjectId"
      ) xp ON xp.sid = s.id
      WHERE qs."userId" = ${userId}::uuid AND qs.status = 'COMPLETED'
      GROUP BY s.id, COALESCE(st.name, s.name), xp.earned
      ORDER BY COALESCE(st.name, s.name) ASC
    `);
  }

  /**
   * Aggregates completed sessions per topic, localized. Only sessions that
   * targeted a topic (topicId not null) contribute; optionally scoped to one
   * subject (decision S4).
   */
  async findTopicStatistics(
    userId: string,
    locale: Language,
    subjectId?: string,
  ): Promise<TopicStatisticsRow[]> {
    const subjectFilter =
      subjectId === undefined
        ? Prisma.empty
        : Prisma.sql`AND qs."subjectId" = ${subjectId}::uuid`;

    return this.prisma.$queryRaw<TopicStatisticsRow[]>(Prisma.sql`
      SELECT
        t.id AS "topicId",
        COALESCE(tt.name, t.name) AS "topicName",
        s.id AS "subjectId",
        COALESCE(st.name, s.name) AS "subjectName",
        COUNT(DISTINCT qs.id)::int AS "completedQuizzes",
        COALESCE(SUM(r."totalQuestions"), 0)::int AS "totalQuestions",
        COALESCE(SUM(r."correctAnswers"), 0)::int AS "correctAnswers",
        COALESCE(xp.earned, 0)::int AS "earnedXP"
      FROM quiz_sessions qs
      JOIN results r ON r."quizSessionId" = qs.id
      JOIN topics t ON t.id = qs."topicId"
      JOIN subjects s ON s.id = t."subjectId"
      LEFT JOIN topic_translations tt
        ON tt."topicId" = t.id AND tt.locale = ${locale}::"Language"
      LEFT JOIN subject_translations st
        ON st."subjectId" = s.id AND st.locale = ${locale}::"Language"
      LEFT JOIN (
        SELECT qs2."topicId" AS tid, SUM(x.amount) AS earned
        FROM xp_transactions x
        JOIN quiz_sessions qs2 ON qs2.id = x."quizSessionId"
        WHERE x."userId" = ${userId}::uuid
          AND qs2.status = 'COMPLETED'
          AND qs2."topicId" IS NOT NULL
        GROUP BY qs2."topicId"
      ) xp ON xp.tid = t.id
      WHERE qs."userId" = ${userId}::uuid
        AND qs.status = 'COMPLETED'
        AND qs."topicId" IS NOT NULL
        ${subjectFilter}
      GROUP BY
        t.id, COALESCE(tt.name, t.name),
        s.id, COALESCE(st.name, s.name), xp.earned
      ORDER BY COALESCE(st.name, s.name) ASC, COALESCE(tt.name, t.name) ASC
    `);
  }

  /** Total completed sessions for the recent-activity page envelope. */
  async countCompletedSessions(userId: string): Promise<number> {
    return this.prisma.quizSession.count({
      where: { userId, status: 'COMPLETED' },
    });
  }

  /**
   * A page of the user's completed sessions, newest first, localized
   * (decision S5).
   */
  async findRecentActivity(
    userId: string,
    locale: Language,
    skip: number,
    take: number,
  ): Promise<RecentActivityRow[]> {
    return this.prisma.$queryRaw<RecentActivityRow[]>(Prisma.sql`
      SELECT
        qs.id AS "sessionId",
        qs."subjectId" AS "subjectId",
        COALESCE(st.name, s.name) AS "subjectName",
        qs."topicId" AS "topicId",
        COALESCE(tt.name, t.name) AS "topicName",
        r.score::text AS "score",
        r.accuracy::text AS "accuracy",
        COALESCE(xp.earned, 0)::int AS "xpEarned",
        qs."completedAt" AS "completedAt"
      FROM quiz_sessions qs
      JOIN results r ON r."quizSessionId" = qs.id
      JOIN subjects s ON s.id = qs."subjectId"
      LEFT JOIN subject_translations st
        ON st."subjectId" = s.id AND st.locale = ${locale}::"Language"
      LEFT JOIN topics t ON t.id = qs."topicId"
      LEFT JOIN topic_translations tt
        ON tt."topicId" = t.id AND tt.locale = ${locale}::"Language"
      LEFT JOIN (
        SELECT x."quizSessionId" AS sid, SUM(x.amount) AS earned
        FROM xp_transactions x
        GROUP BY x."quizSessionId"
      ) xp ON xp.sid = qs.id
      WHERE qs."userId" = ${userId}::uuid AND qs.status = 'COMPLETED'
      ORDER BY qs."completedAt" DESC
      LIMIT ${take} OFFSET ${skip}
    `);
  }
}
