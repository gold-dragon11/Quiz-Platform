import { Injectable } from '@nestjs/common';
import {
  StatisticsRepository,
  XpAward,
} from '../repositories/statistics.repository';
import { PrismaTransactionClient } from '../../prisma/prisma-transaction.type';

/**
 * Statistics module service (docs/06-backend/architecture.md §6). This phase
 * exposes only the completion hook the Quiz engine calls inside its
 * transaction; read endpoints (level, progress, streaks) arrive in the
 * dedicated Statistics phase (decision D16).
 */
@Injectable()
export class StatisticsService {
  constructor(private readonly statisticsRepository: StatisticsRepository) {}

  /**
   * Applies a completed quiz to the user's statistics and records its XP,
   * all within the caller's transaction (decisions D15/D17).
   */
  async applyQuizCompletion(
    tx: PrismaTransactionClient,
    params: {
      userId: string;
      quizSessionId: string;
      resultId: string;
      totalQuestions: number;
      correctAnswers: number;
      incorrectAnswers: number;
      learningTimeSeconds: number;
      awards: XpAward[];
    },
  ): Promise<void> {
    const xpEarned = params.awards.reduce(
      (sum, award) => sum + award.amount,
      0,
    );

    await this.statisticsRepository.applyCompletedQuiz(tx, {
      userId: params.userId,
      totalQuestions: params.totalQuestions,
      correctAnswers: params.correctAnswers,
      incorrectAnswers: params.incorrectAnswers,
      xpEarned,
      learningTimeSeconds: params.learningTimeSeconds,
    });

    await this.statisticsRepository.recordXpAwards(tx, {
      userId: params.userId,
      quizSessionId: params.quizSessionId,
      resultId: params.resultId,
      awards: params.awards,
    });
  }
}
