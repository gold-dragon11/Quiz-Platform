import { Injectable } from '@nestjs/common';
import { DuelStatus, Prisma, QuizStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PrismaTransactionClient } from '../../prisma/prisma-transaction.type';
import {
  drawKeepingPassages,
  type PassageMember,
} from '../../quiz/passage-draw.util';
import type { TimedQuestion } from '../live/question-fit.util';

const PLAYER_SELECT = {
  id: true,
  profile: { select: { displayName: true, username: true } },
} as const;

const DUEL_SELECT = {
  id: true,
  mode: true,
  status: true,
  questionCount: true,
  secondsPerQuestion: true,
  forfeitedById: true,
  expiresAt: true,
  acceptedAt: true,
  completedAt: true,
  createdAt: true,
  challengerId: true,
  opponentId: true,
  challenger: { select: PLAYER_SELECT },
  opponent: { select: PLAYER_SELECT },
  subject: { select: { id: true, name: true } },
  topic: { select: { id: true, name: true } },
  sessions: {
    select: {
      id: true,
      userId: true,
      status: true,
      durationSeconds: true,
      result: {
        select: {
          correctAnswers: true,
          totalQuestions: true,
          accuracy: true,
        },
      },
    },
  },
} as const;

export type DuelRow = Prisma.DuelGetPayload<{ select: typeof DUEL_SELECT }>;

/** A candidate for a live duel: enough to time it, in preference order. */
export interface LivePoolRow extends TimedQuestion {
  id: string;
}

/** Data access for duels (docs/02-domain/duel.md). */
@Injectable()
export class DuelsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    tx: PrismaTransactionClient,
    data: {
      challengerId: string;
      opponentId: string;
      subjectId: string;
      topicId: string | null;
      questionCount: number;
      expiresAt: Date;
    },
  ): Promise<DuelRow> {
    return tx.duel.create({ data, select: DUEL_SELECT });
  }

  async findById(duelId: string): Promise<DuelRow | null> {
    return this.prisma.duel.findUnique({
      where: { id: duelId },
      select: DUEL_SELECT,
    });
  }

  /** Every duel this person is part of, newest first. */
  async listForUser(userId: string): Promise<DuelRow[]> {
    return this.prisma.duel.findMany({
      where: { OR: [{ challengerId: userId }, { opponentId: userId }] },
      orderBy: { createdAt: 'desc' },
      select: DUEL_SELECT,
    });
  }

  async updateStatus(
    duelId: string,
    data: Prisma.DuelUpdateInput,
  ): Promise<DuelRow> {
    return this.prisma.duel.update({
      where: { id: duelId },
      data,
      select: DUEL_SELECT,
    });
  }

  /** Freezes the paper: one order, shared by both players. */
  async setQuestions(
    tx: PrismaTransactionClient,
    duelId: string,
    questionIds: string[],
  ): Promise<void> {
    await tx.duelQuestion.createMany({
      data: questionIds.map((questionId, index) => ({
        duelId,
        questionId,
        order: index,
      })),
    });
  }

  async findQuestionIds(duelId: string): Promise<string[]> {
    const rows = await this.prisma.duelQuestion.findMany({
      where: { duelId },
      orderBy: { order: 'asc' },
      select: { questionId: true },
    });
    return rows.map((row) => row.questionId);
  }

  async findUserByUsername(
    username: string,
  ): Promise<{ id: string; accountStatus: string; isDemo: boolean } | null> {
    const profile = await this.prisma.profile.findUnique({
      where: { username },
      select: {
        user: { select: { id: true, accountStatus: true, isDemo: true } },
      },
    });
    return profile?.user ?? null;
  }

  /** Whether an account is a public demo account (deployment.md §17.9). */
  async isDemoAccount(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isDemo: true },
    });
    return user?.isDemo ?? false;
  }

  /**
   * Questions neither player has met lately.
   *
   * A duel is shared, so per-player filtering is impossible — but using
   * *neither* history is the fair reading: a paper one side has just revised
   * is not a contest. Falls back to whatever the pair saw longest ago, so the
   * draw never comes up empty.
   */
  async selectQuestionsForPair(params: {
    subjectId: string;
    topicId: string | null;
    count: number;
    firstUserId: string;
    secondUserId: string;
  }): Promise<string[]> {
    // The whole pool, then a draw that keeps each passage's questions together
    // (docs/02-domain/passage.md) — a LIMIT would cut texts at random.
    const rows = await this.prisma.$queryRaw<PassageMember[]>(Prisma.sql`
      SELECT q.id, q."passageId", q."passageOrder"
      FROM questions q
      JOIN topics t ON t.id = q."topicId"
      JOIN subjects s ON s.id = t."subjectId"
      LEFT JOIN LATERAL (
        SELECT MAX(e."shownAt") AS last_seen
        FROM question_exposures e
        WHERE e."questionId" = q.id
          AND e."userId" IN (${params.firstUserId}::uuid, ${params.secondUserId}::uuid)
      ) seen ON true
      WHERE q."deletedAt" IS NULL AND q."isPublished" = true
        AND t."deletedAt" IS NULL AND t."isPublished" = true
        AND s."deletedAt" IS NULL AND s."isPublished" = true
        AND s.id = ${params.subjectId}::uuid
        ${
          params.topicId === null
            ? Prisma.empty
            : Prisma.sql`AND t.id = ${params.topicId}::uuid`
        }
      ORDER BY seen.last_seen ASC NULLS FIRST, random()
    `);
    return drawKeepingPassages(rows, params.count);
  }

  /**
   * Every published question of a subject or topic, with what it takes to time
   * it (docs/02-domain/duel.md §5.2), in preference order: those the players
   * met longest ago first, then random. The timing filter runs in code, so the
   * estimate has one definition; the pool is a subject at most, a few thousand
   * short rows.
   *
   * Without players the order is only random — that is the availability count.
   */
  async findLivePool(params: {
    subjectId: string;
    topicId: string | null;
    userIds: string[];
  }): Promise<LivePoolRow[]> {
    const players =
      params.userIds.length > 0
        ? params.userIds
        : ['00000000-0000-0000-0000-000000000000'];

    const rows = await this.prisma.$queryRaw<
      {
        id: string;
        type: LivePoolRow['type'];
        difficulty: LivePoolRow['difficulty'];
        subjectSlug: string;
        textLength: number;
        hasImage: boolean;
        inPassage: boolean;
      }[]
    >(Prisma.sql`
      SELECT q.id, q.type, q.difficulty, s.slug AS "subjectSlug",
             (length(q.title) + COALESCE(o.text_length, 0))::int AS "textLength",
             (q."imageUrl" IS NOT NULL OR COALESCE(o.has_image, false)) AS "hasImage",
             (q."passageId" IS NOT NULL) AS "inPassage"
      FROM questions q
      JOIN topics t ON t.id = q."topicId"
      JOIN subjects s ON s.id = t."subjectId"
      LEFT JOIN LATERAL (
        SELECT SUM(length(ao.content)) AS text_length,
               BOOL_OR(ao."imageUrl" IS NOT NULL) AS has_image
        FROM answer_options ao
        WHERE ao."questionId" = q.id
      ) o ON true
      LEFT JOIN LATERAL (
        SELECT MAX(e."shownAt") AS last_seen
        FROM question_exposures e
        WHERE e."questionId" = q.id
          AND e."userId" = ANY(${players}::uuid[])
      ) seen ON true
      WHERE q."deletedAt" IS NULL AND q."isPublished" = true
        AND t."deletedAt" IS NULL AND t."isPublished" = true
        AND s."deletedAt" IS NULL AND s."isPublished" = true
        AND s.id = ${params.subjectId}::uuid
        ${
          params.topicId === null
            ? Prisma.empty
            : Prisma.sql`AND t.id = ${params.topicId}::uuid`
        }
      ORDER BY seen.last_seen ASC NULLS FIRST, random()
    `);
    return rows;
  }

  /** Challenges nobody answered, so a stale list does not accumulate. */
  async expireStale(): Promise<number> {
    const { count } = await this.prisma.duel.updateMany({
      where: { status: DuelStatus.PENDING, expiresAt: { lt: new Date() } },
      data: { status: DuelStatus.EXPIRED },
    });
    return count;
  }

  /** True once both players have a completed session. */
  bothFinished(duel: DuelRow): boolean {
    const finished = duel.sessions.filter(
      (session) => session.status === QuizStatus.COMPLETED,
    );
    return (
      finished.some((session) => session.userId === duel.challengerId) &&
      finished.some((session) => session.userId === duel.opponentId)
    );
  }
}
