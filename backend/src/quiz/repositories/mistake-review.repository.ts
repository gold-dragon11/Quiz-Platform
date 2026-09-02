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
   * Records a wrong answer: puts the question on the first rung, whether it is
   * new, part-way up the ladder, or already cleared. Getting something wrong
   * again means it was not learnt, however convincing the earlier run looked.
   */
  async demote(
    tx: PrismaTransactionClient,
    userId: string,
    questionId: string,
  ): Promise<void> {
    const dueAt = nextDueDate(1);
    await tx.mistakeReview.upsert({
      where: { userId_questionId: { userId, questionId } },
      create: { userId, questionId, stage: 1, dueAt },
      update: {
        stage: 1,
        dueAt,
        clearedAt: null,
        timesWrong: { increment: 1 },
      },
    });
  }

  /**
   * Records a correct answer, but only for a question already on the ladder —
   * getting an unseen question right is not an achievement worth tracking.
   *
   * Correct answers count wherever they happen, not only inside a review
   * session. A learner who meets the question in ordinary practice and gets it
   * right has demonstrated the same thing, and a schedule that ignored that
   * would keep nagging them about material they have plainly recovered.
   */
  async promote(
    tx: PrismaTransactionClient,
    userId: string,
    questionId: string,
  ): Promise<void> {
    const existing = await tx.mistakeReview.findUnique({
      where: { userId_questionId: { userId, questionId } },
      select: { stage: true, clearedAt: true },
    });
    if (!existing || existing.clearedAt) {
      return;
    }

    const nextStage = existing.stage + 1;
    const cleared = nextStage > REVIEW_LADDER_DAYS.length;

    await tx.mistakeReview.update({
      where: { userId_questionId: { userId, questionId } },
      data: {
        stage: cleared ? REVIEW_LADDER_DAYS.length : nextStage,
        dueAt: cleared ? new Date() : nextDueDate(nextStage),
        clearedAt: cleared ? new Date() : null,
        timesCorrect: { increment: 1 },
      },
    });
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

  /** Counts for the badge: what is due now, and what is still on the ladder. */
  async summarize(
    userId: string,
  ): Promise<{ due: number; scheduled: number; cleared: number }> {
    const [due, scheduled, cleared] = await Promise.all([
      this.prisma.mistakeReview.count({
        where: { userId, clearedAt: null, dueAt: { lte: new Date() } },
      }),
      this.prisma.mistakeReview.count({
        where: { userId, clearedAt: null },
      }),
      this.prisma.mistakeReview.count({
        where: { userId, NOT: { clearedAt: null } },
      }),
    ]);
    return { due, scheduled, cleared };
  }
}
