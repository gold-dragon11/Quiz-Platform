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
  completedAt: Date;
}

/** One NMT paper's score in a mock sitting (docs/02-domain/nmt-paper.md §6). */
export interface PaperScoreInput {
  subjectId: string;
  testPoints: number;
  maxTestPoints: number;
  scaledScore: number | null;
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
      /** A mock sitting's paper scores, one per paper; empty otherwise. */
      paperScores?: PaperScoreInput[];
      completedAt: Date;
    },
  ): Promise<{ id: string }> {
    const paperScores = params.paperScores ?? [];
    return tx.result.create({
      data: {
        quizSessionId: params.quizSessionId,
        correctAnswers: params.correctAnswers,
        incorrectAnswers: params.incorrectAnswers,
        unansweredQuestions: params.unansweredQuestions,
        totalQuestions: params.totalQuestions,
        accuracy: params.accuracy,
        score: params.score,
        completedAt: params.completedAt,
        ...(paperScores.length > 0
          ? { paperScores: { create: paperScores } }
          : {}),
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
