import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PrismaTransactionClient } from '../../prisma/prisma-transaction.type';

/**
 * Persistence for user Statistics (docs/02-domain/statistics.md). Writes are
 * transaction-aware: quiz completion passes its transaction client so the
 * result and the statistics update commit together
 * (docs/06-backend/services.md §8).
 *
 * XP is no longer written (decision 46). `Statistics.totalXP` and the
 * `xp_transactions` rows already recorded are kept untouched as history; no
 * screen reads them.
 */
@Injectable()
export class StatisticsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Applies one completed quiz to the user's cumulative statistics
   * (docs/02-domain/statistics.md §5-6). Incremental — never a full recompute
   * (decision D15). averageAccuracy is recomputed from the running totals so
   * it can never drift.
   */
  async applyCompletedQuiz(
    tx: PrismaTransactionClient,
    params: {
      userId: string;
      totalQuestions: number;
      correctAnswers: number;
      incorrectAnswers: number;
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
        totalLearningTimeSeconds: { increment: params.learningTimeSeconds },
        averageAccuracy,
      },
    });
  }
}
