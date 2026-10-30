import { Injectable } from '@nestjs/common';
import { Language, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

/** The stored aggregate row for a user (docs/02-domain/statistics.md §4). */
export interface OverallStatisticsRow {
  totalQuizzes: number;
  totalQuestions: number;
  correctAnswers: number;
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
}

/**
 * One topic the user still has unresolved mistakes in
 * (docs/04-api/statistics.md §8a).
 */
export interface MistakeGroupRow {
  subjectId: string;
  subjectName: string;
  topicId: string;
  topicName: string;
  mistakeCount: number;
  lastMistakeAt: Date;
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
  completedAt: Date;
}

/**
 * A topic the user has answered anything in: how the last answers went and
 * how many of its questions still wait on the mistake ladder.
 */
export interface TopicMasteryRow {
  topicId: string;
  subjectId: string;
  /** Answers counted, at most the window. */
  recentAnswers: number;
  recentCorrect: number;
  openMistakes: number;
}

/** One topic a session touched: the answer window before it and after it. */
export interface SessionTopicWindowRow {
  topicId: string;
  topicName: string;
  beforeAnswers: number;
  beforeCorrect: number;
  afterAnswers: number;
  afterCorrect: number;
  /** Questions of this topic answered in the session itself. */
  answeredHere: number;
  openMistakes: number;
}

/** A published subject and how many published topics it has. */
export interface SubjectTopicCountRow {
  subjectId: string;
  subjectName: string;
  topicsTotal: number;
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
        COALESCE(SUM(r."correctAnswers"), 0)::int AS "correctAnswers"
      FROM quiz_sessions qs
      JOIN results r ON r."quizSessionId" = qs.id
      JOIN subjects s ON s.id = qs."subjectId"
      LEFT JOIN subject_translations st
        ON st."subjectId" = s.id AND st.locale = ${locale}::"Language"
      WHERE qs."userId" = ${userId}::uuid AND qs.status = 'COMPLETED'
      GROUP BY s.id, COALESCE(st.name, s.name)
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
        COALESCE(SUM(r."correctAnswers"), 0)::int AS "correctAnswers"
      FROM quiz_sessions qs
      JOIN results r ON r."quizSessionId" = qs.id
      JOIN topics t ON t.id = qs."topicId"
      JOIN subjects s ON s.id = t."subjectId"
      LEFT JOIN topic_translations tt
        ON tt."topicId" = t.id AND tt.locale = ${locale}::"Language"
      LEFT JOIN subject_translations st
        ON st."subjectId" = s.id AND st.locale = ${locale}::"Language"
      WHERE qs."userId" = ${userId}::uuid
        AND qs.status = 'COMPLETED'
        AND qs."topicId" IS NOT NULL
        ${subjectFilter}
      GROUP BY
        t.id, COALESCE(tt.name, t.name),
        s.id, COALESCE(st.name, s.name)
      ORDER BY COALESCE(st.name, s.name) ASC, COALESCE(tt.name, t.name) ASC
    `);
  }

  /**
   * Topics the user still gets wrong, grouped for the mistakes view
   * (docs/04-api/statistics.md §8a).
   *
   * "Still" is the whole point: only the *latest* attempt per question counts,
   * so answering a question correctly later removes it from the list. That is
   * what makes the list shrink as the reader improves, rather than
   * accumulating every mistake they ever made.
   *
   * Grouping is by the question's own topic, not the session's — a random
   * subject-wide quiz stores no topic on the session, yet its questions each
   * belong to one.
   */
  async findMistakeGroups(
    userId: string,
    locale: Language,
  ): Promise<MistakeGroupRow[]> {
    return this.prisma.$queryRaw<MistakeGroupRow[]>(Prisma.sql`
      WITH latest AS (
        SELECT DISTINCT ON (qa."questionId")
          qa."questionId",
          qa."isCorrect",
          qa."answeredAt"
        FROM question_attempts qa
        JOIN quiz_sessions qs ON qs.id = qa."quizSessionId"
        WHERE qs."userId" = ${userId}::uuid
        ORDER BY qa."questionId", qa."answeredAt" DESC
      )
      SELECT
        s.id AS "subjectId",
        COALESCE(st.name, s.name) AS "subjectName",
        t.id AS "topicId",
        COALESCE(tt.name, t.name) AS "topicName",
        COUNT(*)::int AS "mistakeCount",
        MAX(latest."answeredAt") AS "lastMistakeAt"
      FROM latest
      JOIN questions q ON q.id = latest."questionId"
      JOIN topics t ON t.id = q."topicId"
      JOIN subjects s ON s.id = t."subjectId"
      LEFT JOIN topic_translations tt
        ON tt."topicId" = t.id AND tt.locale = ${locale}::"Language"
      LEFT JOIN subject_translations st
        ON st."subjectId" = s.id AND st.locale = ${locale}::"Language"
      WHERE latest."isCorrect" = false
        -- Only questions that could actually be served again: an unpublished
        -- or deleted one would make a practice quiz impossible to fill.
        AND q."deletedAt" IS NULL AND q."isPublished" = true
        AND t."deletedAt" IS NULL AND t."isPublished" = true
        AND s."deletedAt" IS NULL AND s."isPublished" = true
      GROUP BY
        s.id, COALESCE(st.name, s.name),
        t.id, COALESCE(tt.name, t.name)
      ORDER BY COUNT(*) DESC, MAX(latest."answeredAt") DESC
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
        qs."completedAt" AS "completedAt"
      FROM quiz_sessions qs
      JOIN results r ON r."quizSessionId" = qs.id
      JOIN subjects s ON s.id = qs."subjectId"
      LEFT JOIN subject_translations st
        ON st."subjectId" = s.id AND st.locale = ${locale}::"Language"
      LEFT JOIN topics t ON t.id = qs."topicId"
      LEFT JOIN topic_translations tt
        ON tt."topicId" = t.id AND tt.locale = ${locale}::"Language"
      WHERE qs."userId" = ${userId}::uuid AND qs.status = 'COMPLETED'
      ORDER BY qs."completedAt" DESC
      LIMIT ${take} OFFSET ${skip}
    `);
  }

  /**
   * For every published topic the user has answered anything in: the last
   * `window` answers by the question's own topic, whatever the session was —
   * a test, a mock paper, a review, homework or a duel — and how many of the
   * topic's questions are still on the mistake ladder.
   */
  async findTopicMastery(
    userId: string,
    window: number,
  ): Promise<TopicMasteryRow[]> {
    return this.prisma.$queryRaw<TopicMasteryRow[]>(Prisma.sql`
      WITH answers AS (
        SELECT q."topicId" AS topic_id,
               qa."isCorrect" AS correct,
               ROW_NUMBER() OVER (
                 PARTITION BY q."topicId"
                 ORDER BY qa."answeredAt" DESC
               ) AS position
        FROM question_attempts qa
        JOIN quiz_sessions qs ON qs.id = qa."quizSessionId"
        JOIN questions q ON q.id = qa."questionId"
        WHERE qs."userId" = ${userId}::uuid
      ),
      recent AS (
        SELECT topic_id,
               COUNT(*)::int AS answers,
               COUNT(*) FILTER (WHERE correct)::int AS correct
        FROM answers
        WHERE position <= ${window}::int
        GROUP BY topic_id
      ),
      open_mistakes AS (
        SELECT q."topicId" AS topic_id, COUNT(*)::int AS open
        FROM mistake_reviews m
        JOIN questions q ON q.id = m."questionId"
        WHERE m."userId" = ${userId}::uuid AND m."clearedAt" IS NULL
        GROUP BY q."topicId"
      )
      SELECT t.id AS "topicId",
             t."subjectId" AS "subjectId",
             recent.answers AS "recentAnswers",
             recent.correct AS "recentCorrect",
             COALESCE(open_mistakes.open, 0) AS "openMistakes"
      FROM recent
      JOIN topics t ON t.id = recent.topic_id
      JOIN subjects s ON s.id = t."subjectId"
      LEFT JOIN open_mistakes ON open_mistakes.topic_id = recent.topic_id
      WHERE t."deletedAt" IS NULL AND t."isPublished" = true
        AND s."deletedAt" IS NULL AND s."isPublished" = true
    `);
  }

  /** Every published subject with its count of published topics, localized. */
  async findSubjectTopicCounts(
    locale: Language,
  ): Promise<SubjectTopicCountRow[]> {
    return this.prisma.$queryRaw<SubjectTopicCountRow[]>(Prisma.sql`
      SELECT s.id AS "subjectId",
             COALESCE(st.name, s.name) AS "subjectName",
             COUNT(t.id)::int AS "topicsTotal"
      FROM subjects s
      JOIN topics t
        ON t."subjectId" = s.id AND t."deletedAt" IS NULL AND t."isPublished" = true
      LEFT JOIN subject_translations st
        ON st."subjectId" = s.id AND st.locale = ${locale}::"Language"
      WHERE s."deletedAt" IS NULL AND s."isPublished" = true
      GROUP BY s.id, COALESCE(st.name, s.name)
      ORDER BY COALESCE(st.name, s.name) ASC
    `);
  }

  /**
   * Where the questions of one session stand on the mistake ladder now: each
   * row is a question of the session that has a ladder entry.
   */
  async findSessionLadder(
    userId: string,
    sessionId: string,
  ): Promise<{ dueAt: Date; clearedAt: Date | null }[]> {
    const questions = await this.prisma.quizSessionQuestion.findMany({
      where: { quizSessionId: sessionId },
      select: { questionId: true },
    });
    return this.prisma.mistakeReview.findMany({
      where: {
        userId,
        questionId: { in: questions.map((row) => row.questionId) },
      },
      select: { dueAt: true, clearedAt: true },
    });
  }

  /**
   * Every topic one session touched, with the user's last `window` answers in
   * it before the session began and as of its end (the session's own answers
   * included, later ones not), and how many of its questions wait on the
   * ladder now.
   */
  async findSessionTopicWindows(
    userId: string,
    sessionId: string,
    startedAt: Date,
    window: number,
    locale: Language,
  ): Promise<SessionTopicWindowRow[]> {
    return this.prisma.$queryRaw<SessionTopicWindowRow[]>(Prisma.sql`
      WITH touched AS (
        SELECT DISTINCT q."topicId" AS topic_id
        FROM quiz_session_questions sq
        JOIN questions q ON q.id = sq."questionId"
        WHERE sq."quizSessionId" = ${sessionId}::uuid
      ),
      answers AS (
        SELECT q."topicId" AS topic_id,
               qa."isCorrect" AS correct,
               qa."answeredAt" AS at,
               qa."quizSessionId" = ${sessionId}::uuid AS here
        FROM question_attempts qa
        JOIN quiz_sessions s ON s.id = qa."quizSessionId"
        JOIN questions q ON q.id = qa."questionId"
        WHERE s."userId" = ${userId}::uuid
          AND q."topicId" IN (SELECT topic_id FROM touched)
      ),
      before AS (
        SELECT topic_id, correct,
               ROW_NUMBER() OVER (PARTITION BY topic_id ORDER BY at DESC) AS position
        FROM answers
        WHERE NOT here AND at < ${startedAt}
      ),
      after AS (
        SELECT topic_id, correct,
               ROW_NUMBER() OVER (PARTITION BY topic_id ORDER BY here DESC, at DESC) AS position
        FROM answers
        WHERE here OR at < ${startedAt}
      ),
      open_mistakes AS (
        SELECT q."topicId" AS topic_id, COUNT(*)::int AS open
        FROM mistake_reviews m
        JOIN questions q ON q.id = m."questionId"
        WHERE m."userId" = ${userId}::uuid AND m."clearedAt" IS NULL
        GROUP BY q."topicId"
      )
      SELECT t.id AS "topicId",
             COALESCE(tt.name, t.name) AS "topicName",
             (SELECT COUNT(*) FROM before b WHERE b.topic_id = t.id AND b.position <= ${window}::int)::int AS "beforeAnswers",
             (SELECT COUNT(*) FROM before b WHERE b.topic_id = t.id AND b.position <= ${window}::int AND b.correct)::int AS "beforeCorrect",
             (SELECT COUNT(*) FROM after a WHERE a.topic_id = t.id AND a.position <= ${window}::int)::int AS "afterAnswers",
             (SELECT COUNT(*) FROM after a WHERE a.topic_id = t.id AND a.position <= ${window}::int AND a.correct)::int AS "afterCorrect",
             (SELECT COUNT(*) FROM answers a WHERE a.topic_id = t.id AND a.here)::int AS "answeredHere",
             COALESCE(open_mistakes.open, 0) AS "openMistakes"
      FROM touched
      JOIN topics t ON t.id = touched.topic_id
      LEFT JOIN topic_translations tt
        ON tt."topicId" = t.id AND tt.locale = ${locale}::"Language"
      LEFT JOIN open_mistakes ON open_mistakes.topic_id = t.id
    `);
  }

  /** Questions the user once got wrong and then cleared the whole ladder for. */
  async countFixedMistakes(userId: string): Promise<number> {
    return this.prisma.mistakeReview.count({
      where: { userId, clearedAt: { not: null } },
    });
  }
}
