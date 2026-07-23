import { Injectable } from '@nestjs/common';
import { XPSource } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PrismaTransactionClient } from '../../prisma/prisma-transaction.type';

/** One XP award to persist during quiz completion. */
export interface XpAward {
  amount: number;
  reason: XPSource;
}

/**
 * Persistence for user Statistics and XP transactions
 * (docs/02-domain/statistics.md, docs/02-domain/xp-transaction.md). Writes are
 * transaction-aware: quiz completion passes its transaction client so the
 * result, XP, and statistics updates all commit together
 * (docs/06-backend/services.md §8).
 */
@Injectable()
export class StatisticsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Applies one completed quiz to the user's cumulative statistics
   * (docs/02-domain/statistics.md §5-6). Incremental — never a full recompute
   * (decision D15). averageAccuracy is recomputed from the running totals so
   * it can never drift. Streaks and level are deferred to the Statistics
   * phase and left untouched.
   */
  async applyCompletedQuiz(
    tx: PrismaTransactionClient,
    params: {
      userId: string;
      totalQuestions: number;
      correctAnswers: number;
      incorrectAnswers: number;
      xpEarned: number;
      learningTimeSeconds: number;
    },
  ): Promise<void> {
    const current = await tx.statistics.findUniqueOrThrow({
      where: { userId: params.userId },
      select: { totalQuestions: true, correctAnswers: true },
    });

    const totalQuestions = current.totalQuestions + params.totalQuestions;
    const correctAnswers = current.correctAnswers + params.correctAnswers;
    // Cumulative accuracy across every question the user has ever answered.
    const averageAccuracy =
      totalQuestions === 0
        ? 0
        : Math.round((correctAnswers / totalQuestions) * 10000) / 100;

    await tx.statistics.update({
      where: { userId: params.userId },
      data: {
        totalQuizzes: { increment: 1 },
        totalQuestions: { increment: params.totalQuestions },
        correctAnswers: { increment: params.correctAnswers },
        incorrectAnswers: { increment: params.incorrectAnswers },
        totalXP: { increment: params.xpEarned },
        totalLearningTimeSeconds: { increment: params.learningTimeSeconds },
        averageAccuracy,
      },
    });
  }

  /**
   * Records each XP award as its own transaction row
   * (docs/02-domain/xp-transaction.md). A QUIZ_COMPLETION row is always
   * written (even for 0 XP), preserving the one-completion-one-transaction
   * invariant; a HIGH_ACCURACY_BONUS row is added only when earned
   * (decisions D5/R5).
   */
  async recordXpAwards(
    tx: PrismaTransactionClient,
    params: {
      userId: string;
      quizSessionId: string;
      resultId: string;
      awards: XpAward[];
    },
  ): Promise<void> {
    if (params.awards.length === 0) {
      return;
    }
    await tx.xPTransaction.createMany({
      data: params.awards.map((award) => ({
        userId: params.userId,
        quizSessionId: params.quizSessionId,
        resultId: params.resultId,
        amount: award.amount,
        reason: award.reason,
      })),
    });
  }
}
