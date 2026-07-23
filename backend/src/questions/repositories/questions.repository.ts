import { Injectable } from '@nestjs/common';
import { Difficulty, Language, Prisma, QuestionType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { SortOrder } from '../../subjects/dto/list-subjects-query.dto';
import type { QuestionSortField } from '../dto/list-questions-query.dto';

/** One answer option as exposed through the Admin API. */
export interface AnswerOptionRecord {
  id: string;
  content: string;
  imageUrl: string | null;
  isCorrect: boolean;
  order: number;
}

/**
 * Default-locale question record as exposed through the Admin API. Always
 * carries its answer options and configuration — there is no single-question
 * endpoint, so the list is the admin's editing source
 * (docs/04-api/admin.md §6).
 */
export interface QuestionRecord {
  id: string;
  topicId: string;
  type: QuestionType;
  title: string;
  imageUrl: string | null;
  difficulty: Difficulty | null;
  configuration: Prisma.JsonValue;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
  answerOptions: AnswerOptionRecord[];
}

/** Localized question content written by a locale update. */
export interface QuestionTranslationRecord {
  locale: Language;
  title: string;
  options: { id: string; content: string }[];
}

/**
 * A published question with per-locale translations riding along, as read
 * for the public API (docs/04-api/questions.md §5). isCorrect is never even
 * selected here — answer leakage is prevented at the query level
 * (docs/04-api/questions.md §14).
 */
export interface PublishedQuestionRow {
  id: string;
  type: QuestionType;
  title: string;
  imageUrl: string | null;
  difficulty: Difficulty | null;
  configuration: Prisma.JsonValue;
  translations: { title: string }[];
  answerOptions: {
    id: string;
    content: string;
    imageUrl: string | null;
    order: number;
    translations: { content: string }[];
  }[];
}

/** One option to update, create, or keep during a merge-by-id update. */
export interface OptionWrite {
  id?: string;
  content: string;
  imageUrl: string | null;
  isCorrect: boolean;
  order: number;
}

const OPTION_SELECT = {
  id: true,
  content: true,
  imageUrl: true,
  isCorrect: true,
  order: true,
} as const;

const QUESTION_SELECT = {
  id: true,
  topicId: true,
  type: true,
  title: true,
  imageUrl: true,
  difficulty: true,
  configuration: true,
  isPublished: true,
  createdAt: true,
  updatedAt: true,
  answerOptions: { select: OPTION_SELECT, orderBy: { order: 'asc' } },
} satisfies Prisma.QuestionSelect;

/**
 * Persistence for the Questions module. All reads and writes target
 * non-deleted rows (`deletedAt: null`) — soft-deleted questions are invisible
 * everywhere (docs/03-database/tables.md §6). Answer options have no soft
 * delete; they live and die with their question's edits.
 */
@Injectable()
export class QuestionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findPage(params: {
    skip: number;
    take: number;
    topicId?: string;
    subjectId?: string;
    type?: QuestionType;
    difficulty?: Difficulty;
    isPublished?: boolean;
    search?: string;
    sortBy: QuestionSortField;
    sortOrder: SortOrder;
  }): Promise<{ items: QuestionRecord[]; totalItems: number }> {
    const where: Prisma.QuestionWhereInput = {
      deletedAt: null,
      ...(params.topicId === undefined ? {} : { topicId: params.topicId }),
      ...(params.subjectId === undefined
        ? {}
        : { topic: { subjectId: params.subjectId } }),
      ...(params.type === undefined ? {} : { type: params.type }),
      ...(params.difficulty === undefined
        ? {}
        : { difficulty: params.difficulty }),
      ...(params.isPublished === undefined
        ? {}
        : { isPublished: params.isPublished }),
      ...(params.search === undefined
        ? {}
        : { title: { contains: params.search, mode: 'insensitive' } }),
    };

    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.question.findMany({
        where,
        select: QUESTION_SELECT,
        orderBy: { [params.sortBy]: params.sortOrder },
        skip: params.skip,
        take: params.take,
      }),
      this.prisma.question.count({ where }),
    ]);

    return { items, totalItems };
  }

  async findActiveById(id: string): Promise<QuestionRecord | null> {
    return this.prisma.question.findFirst({
      where: { id, deletedAt: null },
      select: QUESTION_SELECT,
    });
  }

  /**
   * Published, non-deleted questions of one topic for the public API,
   * newest first (docs/04-api/questions.md §5-6). The caller has already
   * verified the topic's own publication chain. When `locale` is given, the
   * matching title and option-content translations ride along.
   */
  async findPublishedPageForTopic(params: {
    topicId: string;
    skip: number;
    take: number;
    locale?: Language;
  }): Promise<{ items: PublishedQuestionRow[]; totalItems: number }> {
    const where: Prisma.QuestionWhereInput = {
      topicId: params.topicId,
      deletedAt: null,
      isPublished: true,
    };
    const translationsWhere =
      params.locale === undefined
        ? { locale: { in: [] as Language[] } }
        : { locale: params.locale };

    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.question.findMany({
        where,
        select: {
          id: true,
          type: true,
          title: true,
          imageUrl: true,
          difficulty: true,
          configuration: true,
          translations: { where: translationsWhere, select: { title: true } },
          answerOptions: {
            select: {
              id: true,
              content: true,
              imageUrl: true,
              order: true,
              translations: {
                where: translationsWhere,
                select: { content: true },
              },
            },
            orderBy: { order: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: params.skip,
        take: params.take,
      }),
      this.prisma.question.count({ where }),
    ]);

    return { items, totalItems };
  }

  async createWithOptions(data: {
    topicId: string;
    type: QuestionType;
    title: string;
    imageUrl?: string;
    difficulty?: Difficulty;
    configuration?: Prisma.InputJsonValue;
    options: OptionWrite[];
  }): Promise<QuestionRecord> {
    return this.prisma.question.create({
      data: {
        topicId: data.topicId,
        type: data.type,
        title: data.title,
        imageUrl: data.imageUrl,
        difficulty: data.difficulty,
        configuration: data.configuration,
        answerOptions: {
          create: data.options.map((option) => ({
            content: option.content,
            imageUrl: option.imageUrl,
            isCorrect: option.isCorrect,
            order: option.order,
          })),
        },
      },
      select: QUESTION_SELECT,
    });
  }

  /**
   * Applies a merge-by-id update atomically (docs/04-api/admin.md §6):
   * scalar fields, option updates and creates, and deletion of options
   * missing from the desired set — all in one transaction, so a failure
   * leaves the question untouched.
   */
  async updateWithOptions(
    id: string,
    data: Prisma.QuestionUpdateInput,
    optionWrites: OptionWrite[] | undefined,
    deleteOptionIds: string[],
  ): Promise<QuestionRecord> {
    return this.prisma.$transaction(async (tx) => {
      await tx.question.update({ where: { id }, data });

      if (optionWrites !== undefined) {
        if (deleteOptionIds.length > 0) {
          await tx.answerOption.deleteMany({
            where: { id: { in: deleteOptionIds }, questionId: id },
          });
        }

        for (const option of optionWrites) {
          if (option.id) {
            await tx.answerOption.update({
              where: { id: option.id },
              data: {
                content: option.content,
                imageUrl: option.imageUrl,
                isCorrect: option.isCorrect,
                order: option.order,
              },
            });
          } else {
            await tx.answerOption.create({
              data: {
                questionId: id,
                content: option.content,
                imageUrl: option.imageUrl,
                isCorrect: option.isCorrect,
                order: option.order,
              },
            });
          }
        }
      }

      return tx.question.findFirstOrThrow({
        where: { id },
        select: QUESTION_SELECT,
      });
    });
  }

  /**
   * Marks the question deleted only if it is still visible, so a repeated
   * delete of the same id reports not-found instead of silently succeeding.
   */
  async softDeleteIfActive(id: string): Promise<boolean> {
    const result = await this.prisma.question.updateMany({
      where: { id, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    return result.count === 1;
  }

  async setPublished(id: string, isPublished: boolean): Promise<void> {
    await this.prisma.question.update({
      where: { id },
      data: { isPublished },
    });
  }

  async findTitleTranslation(
    questionId: string,
    locale: Language,
  ): Promise<{ title: string } | null> {
    return this.prisma.questionTranslation.findUnique({
      where: { questionId_locale: { questionId, locale } },
      select: { title: true },
    });
  }

  /**
   * Upserts the question-title translation and the content translations for
   * the listed options in one transaction
   * (@@unique([questionId, locale]) / @@unique([answerOptionId, locale])).
   * `titleWhenCreating` mirrors the Subjects/Topics pattern: Prisma validates
   * both upsert branches, so the create branch always needs a concrete title.
   */
  async upsertTranslations(params: {
    questionId: string;
    locale: Language;
    titleWhenCreating: string;
    title?: string;
    options: { id: string; content: string }[];
  }): Promise<QuestionTranslationRecord> {
    const { questionId, locale, titleWhenCreating, title, options } = params;

    return this.prisma.$transaction(async (tx) => {
      const titleTranslation = await tx.questionTranslation.upsert({
        where: { questionId_locale: { questionId, locale } },
        create: { questionId, locale, title: titleWhenCreating },
        update: { ...(title === undefined ? {} : { title }) },
        select: { title: true },
      });

      const written: { id: string; content: string }[] = [];
      for (const option of options) {
        const translation = await tx.answerOptionTranslation.upsert({
          where: {
            answerOptionId_locale: { answerOptionId: option.id, locale },
          },
          create: {
            answerOptionId: option.id,
            locale,
            content: option.content,
          },
          update: { content: option.content },
          select: { answerOptionId: true, content: true },
        });
        written.push({
          id: translation.answerOptionId,
          content: translation.content,
        });
      }

      return { locale, title: titleTranslation.title, options: written };
    });
  }
}
