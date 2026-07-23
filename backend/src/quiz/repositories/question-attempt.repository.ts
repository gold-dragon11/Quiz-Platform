import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PrismaTransactionClient } from '../../prisma/prisma-transaction.type';

/** A stored answer attempt as needed by the engine. */
export interface AttemptRecord {
  questionId: string;
  selectedAnswer: Prisma.JsonValue;
  isCorrect: boolean;
  timeSpentSeconds: number | null;
}

/**
 * Persistence for question attempts (docs/02-domain/question-attempt.md).
 * Submissions upsert on the (quizSessionId, questionId) unique key, making a
 * re-answer idempotent and last-write-wins (decisions D7, D19).
 */
@Injectable()
export class QuestionAttemptRepository {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(params: {
    quizSessionId: string;
    questionId: string;
    selectedAnswer: Prisma.InputJsonValue;
    isCorrect: boolean;
    timeSpentSeconds?: number;
  }): Promise<void> {
    await this.prisma.questionAttempt.upsert({
      where: {
        quizSessionId_questionId: {
          quizSessionId: params.quizSessionId,
          questionId: params.questionId,
        },
      },
      create: {
        quizSessionId: params.quizSessionId,
        questionId: params.questionId,
        selectedAnswer: params.selectedAnswer,
        isCorrect: params.isCorrect,
        timeSpentSeconds: params.timeSpentSeconds,
      },
      update: {
        selectedAnswer: params.selectedAnswer,
        isCorrect: params.isCorrect,
        timeSpentSeconds: params.timeSpentSeconds ?? null,
        answeredAt: new Date(),
      },
    });
  }

  async findBySession(
    sessionId: string,
    client: PrismaTransactionClient = this.prisma,
  ): Promise<AttemptRecord[]> {
    return client.questionAttempt.findMany({
      where: { quizSessionId: sessionId },
      select: {
        questionId: true,
        selectedAnswer: true,
        isCorrect: true,
        timeSpentSeconds: true,
      },
    });
  }
}
