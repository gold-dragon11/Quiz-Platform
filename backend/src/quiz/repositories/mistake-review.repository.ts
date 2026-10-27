import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PrismaTransactionClient } from '../../prisma/prisma-transaction.type';

/**
 * The ladder a mistake climbs before it is considered fixed, in days.
 *
 * Three rungs rather than a full spacing algorithm: the learners here are
 * preparing for one exam on one date, not maintaining a deck for years, and a
 * schedule they can hold in their head is one they will trust. A wrong answer
 * always drops back to the first rung.
 */
export const REVIEW_LADDER_DAYS = [1, 3, 7] as const;

/** One rung of the ladder: how far out it schedules, and who is sitting on it. */
export interface LadderRung {
  days: number;
  count: number;
}

/** GET /quiz/mistake-review — the whole state of a learner's ladder. */
export interface MistakeReviewSummary {
  due: number;
  scheduled: number;
  cleared: number;
  ladder: LadderRung[];
}

/** How far out the next showing is, from a rung number (1-based). */
export function nextDueDate(stage: number, from: Date = new Date()): Date {
  const index = Math.min(Math.max(stage, 1), REVIEW_LADDER_DAYS.length) - 1;
  return new Date(from.getTime() + REVIEW_LADDER_DAYS[index] * 86_400_000);
}

/** Data access for the mistake review schedule. */
@Injectable()
export class MistakeReviewRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Moves the ladder for every answer of a finished session.
   *
   * A wrong answer puts the question on the first rung, whether it is new,
   * part-way up the ladder, or already cleared: getting something wrong again
   * means it was not learnt, however convincing the earlier run looked.
   *
   * A correct answer moves a question one rung up, but only one already on the
   * ladder — getting an unseen question right is not an achievement worth
   * tracking. Correct answers count wherever they happen, not only inside a
   * review session: a learner who meets the question in ordinary practice and
   * gets it right has demonstrated the same thing.
   *
   * Written as a handful of set-based statements rather than one per answer.
   * It runs inside the completion transaction, and the database is an ocean
   * away from the API (docs/08-development/deployment.md §17.6): one round
   * trip per answer put a 52-question block over Prisma's five-second limit,
   * and the whole completion rolled back.
   */
  async recordAnswers(
    tx: PrismaTransactionClient,
    userId: string,
    answers: { questionId: string; isCorrect: boolean }[],
  ): Promise<void> {
    if (answers.length === 0) {
      return;
    }

    const now = new Date();
    const existing = await tx.mistakeReview.findMany({
      where: {
        userId,
        questionId: { in: answers.map((answer) => answer.questionId) },
      },
      select: { questionId: true, stage: true, clearedAt: true },
    });
    const onLadder = new Map(existing.map((row) => [row.questionId, row]));

    const wrong = answers
      .filter((answer) => !answer.isCorrect)
      .map((answer) => answer.questionId);
    const wrongAgain = wrong.filter((id) => onLadder.has(id));
    const wrongFirstTime = wrong.filter((id) => !onLadder.has(id));

    // Everyone on one rung moves to the same next rung, so a correct answer
    // costs one statement per rung rather than one per question.
    const climbingByStage = new Map<number, string[]>();
    for (const answer of answers) {
      const row = answer.isCorrect ? onLadder.get(answer.questionId) : null;
      if (row && !row.clearedAt) {
        const rung = climbingByStage.get(row.stage) ?? [];
        rung.push(answer.questionId);
        climbingByStage.set(row.stage, rung);
      }
    }

    const firstRungDue = nextDueDate(1, now);
    if (wrongAgain.length > 0) {
      await tx.mistakeReview.updateMany({
        where: { userId, questionId: { in: wrongAgain } },
        data: {
          stage: 1,
          dueAt: firstRungDue,
          clearedAt: null,
          timesWrong: { increment: 1 },
        },
      });
    }
    if (wrongFirstTime.length > 0) {
      await tx.mistakeReview.createMany({
        data: wrongFirstTime.map((questionId) => ({
          userId,
          questionId,
          stage: 1,
          dueAt: firstRungDue,
        })),
        skipDuplicates: true,
      });
    }
    for (const [stage, questionIds] of climbingByStage) {
      const nextStage = stage + 1;
      const cleared = nextStage > REVIEW_LADDER_DAYS.length;
      await tx.mistakeReview.updateMany({
        where: { userId, questionId: { in: questionIds } },
        data: {
          stage: cleared ? REVIEW_LADDER_DAYS.length : nextStage,
          dueAt: cleared ? now : nextDueDate(nextStage, now),
          clearedAt: cleared ? now : null,
          timesCorrect: { increment: 1 },
        },
      });
    }
  }

  /** Questions due for review now, longest overdue first. */
  async findDueQuestionIds(
    userId: string,
    limit: number,
    subjectId?: string,
  ): Promise<string[]> {
    const rows = await this.prisma.mistakeReview.findMany({
      where: {
        userId,
        clearedAt: null,
        dueAt: { lte: new Date() },
        question: subjectId
          ? { topic: { subjectId }, isPublished: true, deletedAt: null }
          : { isPublished: true, deletedAt: null },
      },
      orderBy: { dueAt: 'asc' },
      take: limit,
      select: { questionId: true },
    });
    return rows.map((row) => row.questionId);
  }

  /**
   * Counts for the badge: what is due now, what is still on the ladder, and
   * how the uncleared ones are spread across its rungs.
   *
   * The rung breakdown is what turns three bare totals into something a
   * learner can read a trajectory off: a pile sitting on rung one means the
   * same mistakes keep coming back, while weight on the top rung means most of
   * them are nearly gone. The rungs are reported with their real intervals so
   * no client has to repeat REVIEW_LADDER_DAYS and drift from it.
   */
  async summarize(userId: string): Promise<MistakeReviewSummary> {
    const [due, scheduled, cleared, byStage] = await Promise.all([
      this.prisma.mistakeReview.count({
        where: { userId, clearedAt: null, dueAt: { lte: new Date() } },
      }),
      this.prisma.mistakeReview.count({
        where: { userId, clearedAt: null },
      }),
      this.prisma.mistakeReview.count({
        where: { userId, NOT: { clearedAt: null } },
      }),
      this.prisma.mistakeReview.groupBy({
        by: ['stage'],
        where: { userId, clearedAt: null },
        _count: { _all: true },
      }),
    ]);

    const countByStage = new Map(
      byStage.map((row) => [row.stage, row._count._all]),
    );

    // Every rung is listed, including the empty ones: a ladder that hides its
    // empty rungs changes shape as a learner progresses, and the shape is the
    // whole point of drawing it.
    const ladder = REVIEW_LADDER_DAYS.map((days, index) => ({
      days,
      count: countByStage.get(index + 1) ?? 0,
    }));

    return { due, scheduled, cleared, ladder };
  }
}
