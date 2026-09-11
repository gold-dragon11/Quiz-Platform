import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PrismaTransactionClient } from '../../prisma/prisma-transaction.type';

/** A quiz result row. */
export interface ResultRecord {
  id: string;
  correctAnswers: number;
  incorrectAnswers: number;
  unansweredQuestions: number;
  totalQuestions: number;
  accuracy: string;
  score: string;
  /** Mock NMT sittings only; null for everything else. */
  testPoints: number | null;
  maxTestPoints: number | null;
  scaledScore: number | null;
  completedAt: Date;
}

/**
 * Persistence for quiz results (docs/02-domain/result.md). A result is created
 * exactly once per session, inside the completion transaction; the unique
 * constraint on quizSessionId is the backstop against duplicates (decision
 * D17).
 */
@Injectable()
export class ResultRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    tx: PrismaTransactionClient,
    params: {
      quizSessionId: string;
      correctAnswers: number;
      incorrectAnswers: number;
      unansweredQuestions: number;
      totalQuestions: number;
      accuracy: number;
      score: number;
      testPoints?: number | null;
      maxTestPoints?: number | null;
      scaledScore?: number | null;
      completedAt: Date;
    },
  ): Promise<{ id: string }> {
    return tx.result.create({
      data: {
        quizSessionId: params.quizSessionId,
        correctAnswers: params.correctAnswers,
        incorrectAnswers: params.incorrectAnswers,
        unansweredQuestions: params.unansweredQuestions,
        totalQuestions: params.totalQuestions,
        accuracy: params.accuracy,
        score: params.score,
        testPoints: params.testPoints ?? null,
        maxTestPoints: params.maxTestPoints ?? null,
        scaledScore: params.scaledScore ?? null,
        completedAt: params.completedAt,
      },
      select: { id: true },
    });
  }

  async findBySession(sessionId: string): Promise<ResultRecord | null> {
    const result = await this.prisma.result.findUnique({
      where: { quizSessionId: sessionId },
      select: {
        id: true,
        correctAnswers: true,
        incorrectAnswers: true,
        unansweredQuestions: true,
        totalQuestions: true,
        accuracy: true,
        score: true,
        testPoints: true,
        maxTestPoints: true,
        scaledScore: true,
        completedAt: true,
      },
    });
    if (!result) {
      return null;
    }
    return {
      ...result,
      accuracy: result.accuracy.toString(),
      score: result.score.toString(),
    };
  }
}
