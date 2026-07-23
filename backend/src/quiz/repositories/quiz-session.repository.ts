import { Injectable } from '@nestjs/common';
import {
  Difficulty,
  Language,
  Prisma,
  QuestionType,
  QuizStatus,
  QuizType,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PrismaTransactionClient } from '../../prisma/prisma-transaction.type';

/** A quiz session row as needed by the engine. */
export interface QuizSessionRecord {
  id: string;
  userId: string;
  subjectId: string;
  topicId: string | null;
  mode: QuizType;
  timerEnabled: boolean;
  questionCount: number;
  status: QuizStatus;
  startedAt: Date;
  expiresAt: Date | null;
  completedAt: Date | null;
  durationSeconds: number | null;
}

/** One snapshot question with its options and per-locale translations. */
export interface SessionQuestionRecord {
  position: number;
  id: string;
  type: QuestionType;
  title: string;
  imageUrl: string | null;
  difficulty: Difficulty | null;
  configuration: Prisma.JsonValue;
  translations: { title: string }[];
  answerOptions: {
    id: string;
    content: string;
    imageUrl: string | null;
    order: number;
    isCorrect: boolean;
    translations: { content: string }[];
  }[];
}

const SESSION_SELECT = {
  id: true,
  userId: true,
  subjectId: true,
  topicId: true,
  mode: true,
  timerEnabled: true,
  questionCount: true,
  status: true,
  startedAt: true,
  expiresAt: true,
  completedAt: true,
  durationSeconds: true,
} as const;

/**
 * Persistence for quiz sessions and their fixed question snapshot
 * (docs/02-domain/quiz-session.md). Owns all Prisma access for the entity;
 * transaction-aware methods take the caller's client so session creation and
 * completion stay atomic (decisions D17, D28).
 */
@Injectable()
export class QuizSessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Picks up to `count` random question ids eligible for a public quiz: the
   * full publication chain must hold (question, topic, subject all published
   * and not soft-deleted), scoped to the subject and optional topic
   * (decisions D21, D23). ORDER BY random() is adequate for MVP scale.
   */
  async selectRandomQuestionIds(params: {
    subjectId: string;
    topicId?: string;
    count: number;
  }): Promise<string[]> {
    const topicFilter =
      params.topicId === undefined
        ? Prisma.empty
        : Prisma.sql`AND t.id = ${params.topicId}::uuid`;

    const rows = await this.prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
      SELECT q.id
      FROM questions q
      JOIN topics t ON t.id = q."topicId"
      JOIN subjects s ON s.id = t."subjectId"
      WHERE q."deletedAt" IS NULL AND q."isPublished" = true
        AND t."deletedAt" IS NULL AND t."isPublished" = true
        AND s."deletedAt" IS NULL AND s."isPublished" = true
        AND s.id = ${params.subjectId}::uuid
        ${topicFilter}
      ORDER BY random()
      LIMIT ${params.count}
    `);

    return rows.map((row) => row.id);
  }

  async findActiveByUser(userId: string): Promise<QuizSessionRecord | null> {
    return this.prisma.quizSession.findFirst({
      where: { userId, status: QuizStatus.ACTIVE },
      select: SESSION_SELECT,
    });
  }

  async findByIdForUser(
    id: string,
    userId: string,
  ): Promise<QuizSessionRecord | null> {
    return this.prisma.quizSession.findFirst({
      where: { id, userId },
      select: SESSION_SELECT,
    });
  }

  /**
   * Creates the session as ACTIVE together with its ordered question snapshot,
   * in one transaction (decisions D1, D3). The partial unique index on active
   * sessions is the concurrency backstop for the one-active-session rule.
   */
  async createSessionWithQuestions(
    tx: PrismaTransactionClient,
    params: {
      userId: string;
      subjectId: string;
      topicId: string | null;
      mode: QuizType;
      timerEnabled: boolean;
      questionCount: number;
      expiresAt: Date | null;
      questionIds: string[];
    },
  ): Promise<QuizSessionRecord> {
    return tx.quizSession.create({
      data: {
        userId: params.userId,
        subjectId: params.subjectId,
        topicId: params.topicId,
        mode: params.mode,
        timerEnabled: params.timerEnabled,
        questionCount: params.questionCount,
        status: QuizStatus.ACTIVE,
        expiresAt: params.expiresAt,
        questions: {
          create: params.questionIds.map((questionId, index) => ({
            questionId,
            position: index,
          })),
        },
      },
      select: SESSION_SELECT,
    });
  }

  /**
   * The snapshot questions in position order, with options and the requested
   * locale's translations riding along (decision D24). Includes isCorrect and
   * configuration; the service decides what to expose per session state.
   */
  async findSessionQuestions(
    sessionId: string,
    locale?: Language,
  ): Promise<SessionQuestionRecord[]> {
    const translationsWhere =
      locale === undefined ? { locale: { in: [] as Language[] } } : { locale };

    const rows = await this.prisma.quizSessionQuestion.findMany({
      where: { quizSessionId: sessionId },
      orderBy: { position: 'asc' },
      select: {
        position: true,
        question: {
          select: {
            id: true,
            type: true,
            title: true,
            imageUrl: true,
            difficulty: true,
            configuration: true,
            translations: { where: translationsWhere, select: { title: true } },
            answerOptions: {
              orderBy: { order: 'asc' },
              select: {
                id: true,
                content: true,
                imageUrl: true,
                order: true,
                isCorrect: true,
                translations: {
                  where: translationsWhere,
                  select: { content: true },
                },
              },
            },
          },
        },
      },
    });

    return rows.map((row) => ({ position: row.position, ...row.question }));
  }

  /** The snapshot question ids of a session (membership + counting). */
  async findSnapshotQuestionIds(
    sessionId: string,
    client: PrismaTransactionClient = this.prisma,
  ): Promise<string[]> {
    const rows = await client.quizSessionQuestion.findMany({
      where: { quizSessionId: sessionId },
      select: { questionId: true },
    });
    return rows.map((row) => row.questionId);
  }

  /**
   * Atomically flips ACTIVE → COMPLETED, stamping completion time and
   * duration (decision D17). Returns false when the session was not ACTIVE
   * (already completed, or a concurrent completer won) so the caller can
   * respond 409 without double-awarding.
   */
  async markCompletedIfActive(
    tx: PrismaTransactionClient,
    params: { id: string; completedAt: Date; durationSeconds: number },
  ): Promise<boolean> {
    const result = await tx.quizSession.updateMany({
      where: { id: params.id, status: QuizStatus.ACTIVE },
      data: {
        status: QuizStatus.COMPLETED,
        completedAt: params.completedAt,
        durationSeconds: params.durationSeconds,
      },
    });
    return result.count === 1;
  }
}
