import { Injectable } from '@nestjs/common';
import { Prisma, QuizType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { SortOrder } from '../../subjects/dto/list-subjects-query.dto';
import type { QuizSortField } from '../dto/list-quizzes-query.dto';

/** A quiz configuration as exposed through the Admin API. */
export interface QuizRecord {
  id: string;
  subjectId: string;
  topicId: string | null;
  title: string;
  description: string | null;
  mode: QuizType;
  questionCount: number;
  timerEnabled: boolean;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const QUIZ_SELECT = {
  id: true,
  subjectId: true,
  topicId: true,
  title: true,
  description: true,
  mode: true,
  questionCount: true,
  timerEnabled: true,
  isPublished: true,
  createdAt: true,
  updatedAt: true,
} as const;

/**
 * Persistence for quiz configurations (docs/04-api/admin.md §8). All reads and
 * writes target non-deleted rows (`deletedAt: null`) — soft-deleted quizzes
 * are invisible everywhere (docs/03-database/tables.md §6). Owns all Prisma
 * access for the entity; question generation and sessions belong to the
 * separate Quiz engine and are untouched here.
 */
@Injectable()
export class QuizConfigRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findPage(params: {
    skip: number;
    take: number;
    subjectId?: string;
    topicId?: string;
    isPublished?: boolean;
    search?: string;
    sortBy: QuizSortField;
    sortOrder: SortOrder;
  }): Promise<{ items: QuizRecord[]; totalItems: number }> {
    const where: Prisma.QuizWhereInput = {
      deletedAt: null,
      ...(params.subjectId === undefined
        ? {}
        : { subjectId: params.subjectId }),
      ...(params.topicId === undefined ? {} : { topicId: params.topicId }),
      ...(params.isPublished === undefined
        ? {}
        : { isPublished: params.isPublished }),
      ...(params.search === undefined
        ? {}
        : { title: { contains: params.search, mode: 'insensitive' } }),
    };

    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.quiz.findMany({
        where,
        select: QUIZ_SELECT,
        orderBy: { [params.sortBy]: params.sortOrder },
        skip: params.skip,
        take: params.take,
      }),
      this.prisma.quiz.count({ where }),
    ]);

    return { items, totalItems };
  }

  async findActiveById(id: string): Promise<QuizRecord | null> {
    return this.prisma.quiz.findFirst({
      where: { id, deletedAt: null },
      select: QUIZ_SELECT,
    });
  }

  async create(data: {
    subjectId: string;
    topicId: string | null;
    title: string;
    description?: string;
    mode: QuizType;
    questionCount: number;
    timerEnabled: boolean;
    isPublished: boolean;
  }): Promise<QuizRecord> {
    return this.prisma.quiz.create({ data, select: QUIZ_SELECT });
  }

  async update(id: string, data: Prisma.QuizUpdateInput): Promise<QuizRecord> {
    return this.prisma.quiz.update({
      where: { id },
      data,
      select: QUIZ_SELECT,
    });
  }

  /**
   * Marks the quiz deleted only if it is still visible, so a repeated delete
   * of the same id reports not-found instead of silently succeeding. The row
   * is retained, so historical Quiz Sessions that reference it stay valid.
   */
  async softDeleteIfActive(id: string): Promise<boolean> {
    const result = await this.prisma.quiz.updateMany({
      where: { id, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    return result.count === 1;
  }
}
