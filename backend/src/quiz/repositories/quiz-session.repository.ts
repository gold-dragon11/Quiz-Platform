import { Injectable } from '@nestjs/common';
import {
  Difficulty,
  Language,
  Prisma,
  QuestionFormat,
  QuestionType,
  QuizStatus,
  QuizType,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PrismaTransactionClient } from '../../prisma/prisma-transaction.type';
import {
  clusterByPassage,
  drawKeepingPassages,
  type PassageMember,
} from '../passage-draw.util';
import type { NmtTask } from '../nmt/nmt-paper.types';
import {
  pickPassageBlock,
  type PassageBlockCandidate,
} from '../nmt/passage-block';

/**
 * Rows older than this can no longer affect selection, so they are dropped.
 *
 * There is deliberately no "recently seen" cut-off to go with it. Decision 15
 * describes a 30-day exclusion with a longest-unseen fallback; ordering by
 * when a question was last shown, never-seen first, produces exactly that
 * behaviour and nothing else. A hard window would empty the pool by the fourth
 * sitting — roughly 41 questions to a topic, ten to a sitting — and tell the
 * learner to come back in a month.
 */
const EXPOSURE_RETENTION_DAYS = 180;

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
  /** Set when the session is a student working through an assignment. */
  assignmentId: string | null;
  /** Set when the session is one player's half of a duel. */
  duelId: string | null;
  /** The joint NMT block this mock sitting belongs to; null otherwise. */
  nmtBlock: string | null;
}

/** One snapshot question with its options and per-locale translations. */
export interface SessionQuestionRecord {
  position: number;
  id: string;
  type: QuestionType;
  title: string;
  imageUrl: string | null;
  difficulty: Difficulty | null;
  /** Revealed only in the post-completion review, never while ACTIVE. */
  explanation: string | null;
  configuration: Prisma.JsonValue;
  /** Position within `passage`, from 1; null for a question that stands alone. */
  passageOrder: number | null;
  /** The text the question is asked about (docs/02-domain/passage.md). */
  passage: { id: string; title: string | null; content: string } | null;
  /** The number on the NMT paper this question fills, when it has one. */
  nmtTask: number | null;
  /** The question's subject: a block's papers both number tasks from 1. */
  subjectSlug: string;
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

/**
 * A question can stand at a paper's task number only in the number's shape:
 * tagged for it, of its type, with as many answer options as the paper prints
 * there (none for a short answer).
 */
function fitsTask(task: NmtTask): Prisma.Sql {
  return Prisma.sql`(
    q."nmtTask" = ${task.number}
    AND q.type = ${task.type}::"QuestionType"
    AND (
      SELECT COUNT(*)::int FROM answer_options o WHERE o."questionId" = q.id
    ) = ${task.optionCount ?? 0}
  )`;
}

const SESSION_SELECT = {
  id: true,
  userId: true,
  subjectId: true,
  topicId: true,
  assignmentId: true,
  duelId: true,
  nmtBlock: true,
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
   * (decisions D21, D23), and optionally to one difficulty level.
   * ORDER BY random() is adequate for MVP scale.
   *
   * The whole eligible pool is read, not a LIMIT of it: a passage has to be
   * taken with all its questions, and how many of them survived the filters is
   * only known once they are read (docs/02-domain/passage.md).
   */
  async selectRandomQuestionIds(params: {
    subjectId: string;
    topicId?: string;
    difficulty?: Difficulty;
    format?: QuestionFormat;
    count: number;
    /** Prefer questions this learner has not seen lately (decision 15). */
    userId?: string;
  }): Promise<string[]> {
    const rows = await this.prisma.$queryRaw<PassageMember[]>(Prisma.sql`
      SELECT q.id, q."passageId", q."passageOrder"
      FROM questions q
      JOIN topics t ON t.id = q."topicId"
      JOIN subjects s ON s.id = t."subjectId"
      ${
        params.userId === undefined
          ? Prisma.empty
          : Prisma.sql`
      LEFT JOIN LATERAL (
        SELECT MAX(e."shownAt") AS last_seen
        FROM question_exposures e
        WHERE e."questionId" = q.id AND e."userId" = ${params.userId}::uuid
      ) seen ON true`
      }
      WHERE ${eligibleQuestionFilter(params)}
      ORDER BY ${
        params.userId === undefined
          ? Prisma.sql`random()`
          : // Never seen first, then longest ago. `random()` only breaks ties,
            // which in practice means shuffling the never-seen pool: every
            // other row has a distinct timestamp. Each sitting pushes what it
            // showed to the back, so repeat practice becomes a round robin
            // rather than a reshuffle.
            Prisma.sql`
        seen.last_seen ASC NULLS FIRST,
        random()`
      }
    `);

    return drawKeepingPassages(rows, params.count);
  }

  /**
   * One question for a task number of a subject's NMT paper, least recently
   * seen by this learner first, then at random (docs/02-domain/nmt-paper.md).
   * Only exam-format questions of the task's own shape qualify.
   */
  async selectQuestionForTask(params: {
    subjectId: string;
    task: NmtTask;
    userId: string;
  }): Promise<string | null> {
    const rows = await this.prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
      SELECT q.id
      FROM questions q
      JOIN topics t ON t.id = q."topicId"
      JOIN subjects s ON s.id = t."subjectId"
      LEFT JOIN LATERAL (
        SELECT MAX(e."shownAt") AS last_seen
        FROM question_exposures e
        WHERE e."questionId" = q.id AND e."userId" = ${params.userId}::uuid
      ) seen ON true
      WHERE ${eligibleQuestionFilter({ subjectId: params.subjectId, format: QuestionFormat.NMT })}
        AND ${fitsTask(params.task)}
      ORDER BY seen.last_seen ASC NULLS FIRST, random()
      LIMIT 1
    `);
    return rows[0]?.id ?? null;
  }

  /**
   * A run of tasks asked about one text: the questions of a single passage
   * that covers every number, the passage this learner met longest ago first
   * (see `pickPassageBlock`). Null when no passage covers the whole run.
   */
  async selectPassageForTasks(params: {
    subjectId: string;
    tasks: NmtTask[];
    userId: string;
  }): Promise<string[] | null> {
    const rows = await this.prisma.$queryRaw<
      PassageBlockCandidate[]
    >(Prisma.sql`
      SELECT q.id, q."passageId", q."passageOrder", q."nmtTask",
        seen.last_seen AS "lastSeen"
      FROM questions q
      JOIN topics t ON t.id = q."topicId"
      JOIN subjects s ON s.id = t."subjectId"
      LEFT JOIN LATERAL (
        SELECT MAX(e."shownAt") AS last_seen
        FROM question_exposures e
        WHERE e."questionId" = q.id AND e."userId" = ${params.userId}::uuid
      ) seen ON true
      WHERE ${eligibleQuestionFilter({ subjectId: params.subjectId, format: QuestionFormat.NMT })}
        AND q."passageId" IS NOT NULL
        AND (${Prisma.join(params.tasks.map(fitsTask), ' OR ')})
      ORDER BY random()
    `);
    return pickPassageBlock(
      rows,
      params.tasks.map((task) => task.number),
    );
  }

  /**
   * Records that these questions were put in front of this learner, and trims
   * the log while it is here.
   *
   * Pruning happens on write rather than on a schedule because the application
   * has no scheduler, and a table that only ever grows is a slow leak: one row
   * per question per sitting, forever. Anything past the retention window can
   * no longer influence selection, so keeping it buys nothing.
   */
  async recordExposure(
    tx: PrismaTransactionClient,
    userId: string,
    questionIds: string[],
  ): Promise<void> {
    if (questionIds.length === 0) {
      return;
    }

    await tx.questionExposure.createMany({
      data: questionIds.map((questionId) => ({ userId, questionId })),
    });
    await tx.questionExposure.deleteMany({
      where: {
        userId,
        shownAt: {
          lt: new Date(
            Date.now() - EXPOSURE_RETENTION_DAYS * 24 * 60 * 60 * 1000,
          ),
        },
      },
    });
  }

  /**
   * How many questions a quiz over these filters could draw from. Lets a
   * caller size a request before making it, instead of discovering an empty
   * pool through a 409 — which matters most for the difficulty filter, since
   * the advanced tier is far smaller than the others (docs/04-api/quiz.md §4a).
   */
  async countEligibleQuestions(params: {
    subjectId: string;
    topicId?: string;
    difficulty?: Difficulty;
    format?: QuestionFormat;
  }): Promise<number> {
    const rows = await this.prisma.$queryRaw<{ count: number }[]>(Prisma.sql`
      SELECT COUNT(*)::int AS count
      FROM questions q
      JOIN topics t ON t.id = q."topicId"
      JOIN subjects s ON s.id = t."subjectId"
      WHERE ${eligibleQuestionFilter(params)}
    `);

    return rows[0]?.count ?? 0;
  }

  /**
   * The same selection as `selectRandomQuestionIds`, narrowed to questions
   * whose *latest* attempt by this user was wrong (docs/04-api/quiz.md §4).
   *
   * The `DISTINCT ON` picks one row per question — the most recent attempt —
   * before correctness is tested, so answering a question correctly later
   * takes it out of the pool. Grouping is by the question's own topic rather
   * than the session's, because a random subject-wide quiz stores no topic on
   * the session while its questions each belong to one.
   */
  async selectMistakeQuestionIds(params: {
    userId: string;
    subjectId: string;
    topicId?: string;
    count: number;
  }): Promise<string[]> {
    const topicFilter =
      params.topicId === undefined
        ? Prisma.empty
        : Prisma.sql`AND t.id = ${params.topicId}::uuid`;

    const rows = await this.prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
      WITH latest AS (
        SELECT DISTINCT ON (qa."questionId")
          qa."questionId",
          qa."isCorrect"
        FROM question_attempts qa
        JOIN quiz_sessions qs ON qs.id = qa."quizSessionId"
        WHERE qs."userId" = ${params.userId}::uuid
        ORDER BY qa."questionId", qa."answeredAt" DESC
      )
      SELECT q.id
      FROM latest
      JOIN questions q ON q.id = latest."questionId"
      JOIN topics t ON t.id = q."topicId"
      JOIN subjects s ON s.id = t."subjectId"
      WHERE latest."isCorrect" = false
        AND q."deletedAt" IS NULL AND q."isPublished" = true
        AND t."deletedAt" IS NULL AND t."isPublished" = true
        AND s."deletedAt" IS NULL AND s."isPublished" = true
        AND s.id = ${params.subjectId}::uuid
        ${topicFilter}
      ORDER BY random()
      LIMIT ${params.count}
    `);

    return rows.map((row) => row.id);
  }

  /**
   * The user's active self-study session, if any.
   *
   * Self-study is limited to one at a time; assignment work is limited per
   * subject (decision 13). Splitting the lookup is what lets a student have
   * unfinished homework in maths and still practise English — the old
   * one-session-for-everything rule would have made them abandon one to touch
   * the other.
   */
  async findActiveSelfStudy(userId: string): Promise<QuizSessionRecord | null> {
    return this.prisma.quizSession.findFirst({
      where: { userId, status: QuizStatus.ACTIVE, assignmentId: null },
      select: SESSION_SELECT,
    });
  }

  /** Active assignment work in one subject — at most one by construction. */
  async findActiveAssignmentInSubject(
    userId: string,
    subjectId: string,
  ): Promise<QuizSessionRecord | null> {
    return this.prisma.quizSession.findFirst({
      where: {
        userId,
        subjectId,
        status: QuizStatus.ACTIVE,
        assignmentId: { not: null },
      },
      select: SESSION_SELECT,
    });
  }

  /** Any active session for this exact assignment — the resume path. */
  async findActiveForAssignment(
    userId: string,
    assignmentId: string,
  ): Promise<QuizSessionRecord | null> {
    return this.prisma.quizSession.findFirst({
      where: { userId, assignmentId, status: QuizStatus.ACTIVE },
      select: SESSION_SELECT,
    });
  }

  /**
   * Completed mock sittings for one learner, oldest first. With a subject, a
   * sitting counts when it was sat in that subject or when a block it belonged
   * to scored a paper in it.
   */
  async findMockExamAttempts(
    userId: string,
    subjectId?: string,
  ): Promise<
    {
      id: string;
      nmtBlock: string | null;
      subject: { id: string; name: string };
      durationSeconds: number | null;
      completedAt: Date | null;
      result: {
        correctAnswers: number;
        totalQuestions: number;
        accuracy: Prisma.Decimal;
        paperScores: {
          subject: { id: string; name: string; slug: string };
          testPoints: number;
          maxTestPoints: number;
          scaledScore: number | null;
        }[];
      } | null;
    }[]
  > {
    return this.prisma.quizSession.findMany({
      where: {
        userId,
        mode: QuizType.MOCK_EXAM,
        status: QuizStatus.COMPLETED,
        ...(subjectId === undefined
          ? {}
          : {
              OR: [
                { subjectId },
                { result: { paperScores: { some: { subjectId } } } },
              ],
            }),
      },
      orderBy: { completedAt: 'asc' },
      select: {
        id: true,
        nmtBlock: true,
        durationSeconds: true,
        completedAt: true,
        subject: { select: { id: true, name: true } },
        result: {
          select: {
            correctAnswers: true,
            totalQuestions: true,
            accuracy: true,
            paperScores: {
              orderBy: { subject: { displayOrder: 'asc' } },
              select: {
                testPoints: true,
                maxTestPoints: true,
                scaledScore: true,
                subject: { select: { id: true, name: true, slug: true } },
              },
            },
          },
        },
      },
    });
  }

  /** The subject's slug, which selects its mock-exam specification. */
  async findSubjectForMock(
    subjectId: string,
  ): Promise<{ id: string; slug: string; name: string } | null> {
    return this.prisma.subject.findFirst({
      where: { id: subjectId, isPublished: true, deletedAt: null },
      select: { id: true, slug: true, name: true },
    });
  }

  /** A subject by id, whatever its publication state. */
  async findSubjectById(
    subjectId: string,
  ): Promise<{ id: string; slug: string; name: string } | null> {
    return this.prisma.subject.findUnique({
      where: { id: subjectId },
      select: { id: true, slug: true, name: true },
    });
  }

  /**
   * Subjects by slug. A block is started only over published subjects; a
   * sitting already taken is shown whatever has happened to them since.
   */
  async findSubjectsBySlugs(
    slugs: string[],
    options: { publishedOnly?: boolean } = {},
  ): Promise<{ id: string; slug: string; name: string }[]> {
    return this.prisma.subject.findMany({
      where: {
        slug: { in: slugs },
        ...(options.publishedOnly
          ? { isPublished: true, deletedAt: null }
          : {}),
      },
      select: { id: true, slug: true, name: true },
    });
  }

  /** This player's unfinished half of a duel — the resume path. */
  async findActiveForDuel(
    userId: string,
    duelId: string,
  ): Promise<QuizSessionRecord | null> {
    return this.prisma.quizSession.findFirst({
      where: { userId, duelId, status: QuizStatus.ACTIVE },
      select: SESSION_SELECT,
    });
  }

  /** Anything active at all — used by the resume banner, which is mode-blind. */
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
      quizId: string | null;
      assignmentId?: string | null;
      duelId?: string | null;
      subjectId: string;
      topicId: string | null;
      mode: QuizType;
      timerEnabled: boolean;
      questionCount: number;
      expiresAt: Date | null;
      questionIds: string[];
      nmtBlock?: string | null;
    },
  ): Promise<QuizSessionRecord> {
    // Whatever assembled the list — a random draw, a teacher, the review
    // schedule — a passage's questions sit together and in their own order.
    const placements = await tx.question.findMany({
      where: { id: { in: params.questionIds } },
      select: { id: true, passageId: true, passageOrder: true },
    });
    const placementById = new Map(placements.map((row) => [row.id, row]));
    const questionIds = clusterByPassage(
      params.questionIds.map(
        (id) =>
          placementById.get(id) ?? { id, passageId: null, passageOrder: null },
      ),
    );

    const session = await tx.quizSession.create({
      data: {
        userId: params.userId,
        quizId: params.quizId,
        assignmentId: params.assignmentId ?? null,
        duelId: params.duelId ?? null,
        subjectId: params.subjectId,
        topicId: params.topicId,
        mode: params.mode,
        timerEnabled: params.timerEnabled,
        questionCount: params.questionCount,
        status: QuizStatus.ACTIVE,
        expiresAt: params.expiresAt,
        nmtBlock: params.nmtBlock ?? null,
        questions: {
          create: questionIds.map((questionId, index) => ({
            questionId,
            position: index,
          })),
        },
      },
      select: SESSION_SELECT,
    });

    // In the same transaction as the snapshot: a session that exists without
    // its exposures would let the learner draw the same questions again the
    // moment they abandon it.
    await this.recordExposure(tx, params.userId, questionIds);

    return session;
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
            explanation: true,
            configuration: true,
            passageOrder: true,
            nmtTask: true,
            topic: { select: { subject: { select: { slug: true } } } },
            passage: { select: { id: true, title: true, content: true } },
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

    return rows.map(({ position, question: { topic, ...question } }) => ({
      position,
      ...question,
      subjectSlug: topic.subject.slug,
    }));
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

  /** Timed sessions whose clock has run out and that nobody has opened since. */
  async findExpiredTimed(now: Date): Promise<QuizSessionRecord[]> {
    return this.prisma.quizSession.findMany({
      where: {
        status: QuizStatus.ACTIVE,
        timerEnabled: true,
        expiresAt: { lte: now },
      },
      select: SESSION_SELECT,
    });
  }

  /**
   * Closes untimed sessions with no sign of life since `idleSince`: started
   * before it, and no answer saved after it. Measured from the last answer,
   * not the start, so a long homework worked through a little each day is
   * never taken away from someone still doing it.
   */
  async abandonIdle(idleSince: Date): Promise<number> {
    const { count } = await this.prisma.quizSession.updateMany({
      where: {
        status: QuizStatus.ACTIVE,
        timerEnabled: false,
        startedAt: { lt: idleSince },
        attempts: { none: { answeredAt: { gte: idleSince } } },
      },
      data: { status: QuizStatus.ABANDONED },
    });
    return count;
  }
}

/**
 * The eligibility predicate shared by the question picker and its counter.
 *
 * Kept in one place deliberately: if the two drifted, the count would promise
 * a pool the picker cannot actually deliver, and the caller would still hit
 * the 409 the count exists to prevent.
 */
function eligibleQuestionFilter(params: {
  subjectId: string;
  topicId?: string;
  difficulty?: Difficulty;
  format?: QuestionFormat;
}): Prisma.Sql {
  return Prisma.sql`
    q."deletedAt" IS NULL AND q."isPublished" = true
    AND t."deletedAt" IS NULL AND t."isPublished" = true
    AND s."deletedAt" IS NULL AND s."isPublished" = true
    AND s.id = ${params.subjectId}::uuid
    ${
      params.topicId === undefined
        ? Prisma.empty
        : Prisma.sql`AND t.id = ${params.topicId}::uuid`
    }
    ${
      params.difficulty === undefined
        ? Prisma.empty
        : Prisma.sql`AND q.difficulty = ${params.difficulty}::"Difficulty"`
    }
    ${
      params.format === undefined
        ? Prisma.empty
        : Prisma.sql`AND q.format = ${params.format}::"QuestionFormat"`
    }
  `;
}
