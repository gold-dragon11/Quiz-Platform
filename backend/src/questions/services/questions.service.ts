import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Language, Prisma, QuestionType } from '@prisma/client';
import { TopicsService } from '../../topics/services/topics.service';
import { AnswerOptionInputDto } from '../dto/answer-option-input.dto';
import { CreateQuestionDto } from '../dto/create-question.dto';
import { ListQuestionsQueryDto } from '../dto/list-questions-query.dto';
import { PublishQuestionDto } from '../dto/publish-question.dto';
import { UpdateQuestionDto } from '../dto/update-question.dto';
import {
  OptionWrite,
  QuestionRecord,
  QuestionTranslationRecord,
  QuestionsRepository,
} from '../repositories/questions.repository';
import { PaginatedQuestions } from '../types/paginated-questions.type';

/** The default locale lives on the Question row itself, not in a translation. */
const DEFAULT_LOCALE = Language.ENGLISH;

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 20;

const QUESTION_NOT_FOUND_MESSAGE = 'Question not found.';
const TOPIC_NOT_FOUND_MESSAGE = 'Topic not found.';
const OPTION_COUNT_MESSAGE = `A question requires between ${MIN_OPTIONS} and ${MAX_OPTIONS} answer options.`;
const OPTION_IDS_AT_CREATION_MESSAGE =
  'options cannot reference ids at creation.';
const OPTION_ID_UNKNOWN_MESSAGE = 'option ids must belong to this question.';
const OPTION_ID_DUPLICATE_MESSAGE =
  'option ids must be unique within the payload.';
const OPTION_CONTENT_REQUIRED_MESSAGE =
  'content is required when creating a new answer option.';
const OPTION_ORDER_ALL_OR_NONE_MESSAGE =
  'options must provide order for all entries or none.';
const OPTION_ORDER_UNIQUE_MESSAGE = 'option order values must be unique.';
const SINGLE_CHOICE_CORRECT_MESSAGE =
  'SINGLE_CHOICE questions require exactly one correct option.';
const MATCHING_IS_CORRECT_MESSAGE =
  'isCorrect is not allowed for MATCHING question options.';
const CONFIGURATION_REQUIRED_MESSAGE =
  'configuration is required for MATCHING questions.';
const CONFIGURATION_FORBIDDEN_MESSAGE =
  'configuration is not allowed for SINGLE_CHOICE questions.';
const CONFIGURATION_INVALID_MESSAGE =
  'configuration must pair every option order exactly once.';
const DEFAULT_LOCALE_MESSAGE =
  'locale must be a non-default locale; update the question itself for English content.';
const LOCALIZED_FIELDS_MESSAGE =
  'Only title and options can be provided together with locale.';
const LOCALIZED_OPTION_SHAPE_MESSAGE =
  'Localized options accept only id and content.';
const TRANSLATION_TITLE_REQUIRED_MESSAGE =
  'title is required when creating a new translation.';

/**
 * Question management use cases (docs/04-api/admin.md §6, §10,
 * docs/02-domain/question.md, docs/02-domain/answer-option.md).
 *
 * Correctness rules by type (docs/02-domain/answer-option.md §8-9):
 * - SINGLE_CHOICE — exactly one option isCorrect, no configuration;
 * - MATCHING — correctness lives in `configuration.pairs` referencing option
 *   order values; isCorrect is not accepted on options.
 *
 * The question type is immutable and publication state changes only through
 * the publish endpoint — both fields are absent from the update DTO, so the
 * whitelist pipe rejects them.
 */
@Injectable()
export class QuestionsService {
  constructor(
    private readonly questionsRepository: QuestionsRepository,
    private readonly topicsService: TopicsService,
  ) {}

  async list(query: ListQuestionsQueryDto): Promise<PaginatedQuestions> {
    const { items, totalItems } = await this.questionsRepository.findPage({
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      topicId: query.topicId,
      subjectId: query.subjectId,
      type: query.type,
      difficulty: query.difficulty,
      isPublished: query.isPublished,
      search: query.search,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });

    return {
      items,
      page: query.page,
      pageSize: query.pageSize,
      totalItems,
      totalPages: Math.ceil(totalItems / query.pageSize),
    };
  }

  async create(dto: CreateQuestionDto): Promise<QuestionRecord> {
    // The parent must exist and not be soft-deleted
    // (docs/02-domain/question.md §7).
    if (!(await this.topicsService.topicExists(dto.topicId))) {
      throw new NotFoundException(TOPIC_NOT_FOUND_MESSAGE);
    }

    if (dto.options.some((option) => option.id !== undefined)) {
      throw new BadRequestException(OPTION_IDS_AT_CREATION_MESSAGE);
    }

    const orders = this.resolveOrders(dto.options);
    const options: OptionWrite[] = dto.options.map((option, index) => {
      if (option.content === undefined) {
        throw new BadRequestException(OPTION_CONTENT_REQUIRED_MESSAGE);
      }
      return {
        content: option.content,
        imageUrl: option.imageUrl ?? null,
        isCorrect: option.isCorrect ?? false,
        order: orders[index],
      };
    });

    this.validateOptionSet(
      dto.type,
      options,
      dto.configuration,
      dto.options.some((option) => option.isCorrect !== undefined),
    );

    return this.questionsRepository.createWithOptions({
      topicId: dto.topicId,
      type: dto.type,
      title: dto.title,
      imageUrl: dto.imageUrl,
      difficulty: dto.difficulty,
      configuration: dto.configuration as Prisma.InputJsonValue | undefined,
      options,
    });
  }

  async update(
    id: string,
    dto: UpdateQuestionDto,
  ): Promise<QuestionRecord | QuestionTranslationRecord> {
    if (dto.locale !== undefined) {
      return this.upsertTranslations(id, dto);
    }

    const question = await this.questionsRepository.findActiveById(id);
    if (!question) {
      throw new NotFoundException(QUESTION_NOT_FOUND_MESSAGE);
    }

    let optionWrites: OptionWrite[] | undefined;
    let deleteOptionIds: string[] = [];
    let isCorrectProvided = false;

    if (dto.options !== undefined) {
      const existingById = new Map(
        question.answerOptions.map((option) => [option.id, option]),
      );

      const seenIds = new Set<string>();
      for (const entry of dto.options) {
        if (entry.id !== undefined) {
          if (!existingById.has(entry.id)) {
            throw new BadRequestException(OPTION_ID_UNKNOWN_MESSAGE);
          }
          if (seenIds.has(entry.id)) {
            throw new BadRequestException(OPTION_ID_DUPLICATE_MESSAGE);
          }
          seenIds.add(entry.id);
        }
      }

      if (
        dto.options.length < MIN_OPTIONS ||
        dto.options.length > MAX_OPTIONS
      ) {
        throw new BadRequestException(OPTION_COUNT_MESSAGE);
      }

      const orders = this.resolveOrders(dto.options);
      isCorrectProvided = dto.options.some(
        (entry) => entry.isCorrect !== undefined,
      );

      // The payload is the complete desired option set, merged by id
      // (docs/04-api/admin.md §6).
      optionWrites = dto.options.map((entry, index) => {
        const existing = entry.id ? existingById.get(entry.id) : undefined;
        if (!existing && entry.content === undefined) {
          throw new BadRequestException(OPTION_CONTENT_REQUIRED_MESSAGE);
        }
        return {
          id: entry.id,
          content: entry.content ?? (existing?.content as string),
          imageUrl:
            entry.imageUrl === undefined
              ? (existing?.imageUrl ?? null)
              : entry.imageUrl,
          isCorrect: entry.isCorrect ?? existing?.isCorrect ?? false,
          order: orders[index],
        };
      });

      deleteOptionIds = question.answerOptions
        .map((option) => option.id)
        .filter((optionId) => !seenIds.has(optionId));
    }

    const finalOptions: OptionWrite[] =
      optionWrites ??
      question.answerOptions.map((option) => ({
        id: option.id,
        content: option.content,
        imageUrl: option.imageUrl,
        isCorrect: option.isCorrect,
        order: option.order,
      }));

    const effectiveConfiguration =
      dto.configuration !== undefined
        ? dto.configuration
        : (question.configuration ?? undefined);

    // Every update revalidates the complete option set against the
    // (immutable) question type (docs/02-domain/question.md §7).
    this.validateOptionSet(
      question.type,
      finalOptions,
      effectiveConfiguration,
      isCorrectProvided,
      dto.configuration !== undefined,
    );

    const data: Prisma.QuestionUpdateInput = {
      ...(dto.title === undefined ? {} : { title: dto.title }),
      ...(dto.imageUrl === undefined ? {} : { imageUrl: dto.imageUrl }),
      ...(dto.difficulty === undefined ? {} : { difficulty: dto.difficulty }),
      ...(dto.configuration === undefined
        ? {}
        : { configuration: dto.configuration as Prisma.InputJsonValue }),
    };

    return this.questionsRepository.updateWithOptions(
      id,
      data,
      optionWrites,
      deleteOptionIds,
    );
  }

  async remove(id: string): Promise<void> {
    const deleted = await this.questionsRepository.softDeleteIfActive(id);
    if (!deleted) {
      throw new NotFoundException(QUESTION_NOT_FOUND_MESSAGE);
    }
  }

  /**
   * PATCH /publish — the only mutation of publication state
   * (docs/04-api/admin.md §10). Publication re-validates the stored question:
   * invalid questions cannot be published (docs/02-domain/question.md §7).
   */
  async setPublished(
    id: string,
    dto: PublishQuestionDto,
  ): Promise<QuestionRecord> {
    const question = await this.questionsRepository.findActiveById(id);
    if (!question) {
      throw new NotFoundException(QUESTION_NOT_FOUND_MESSAGE);
    }

    if (dto.isPublished) {
      this.validateOptionSet(
        question.type,
        question.answerOptions,
        question.configuration ?? undefined,
        false,
      );
    }

    await this.questionsRepository.setPublished(id, dto.isPublished);
    return { ...question, isPublished: dto.isPublished };
  }

  /**
   * PUT with `locale` upserts the QuestionTranslation title and the
   * AnswerOptionTranslation contents for the listed options
   * (docs/02-domain/question.md §11, docs/02-domain/answer-option.md §12).
   */
  private async upsertTranslations(
    id: string,
    dto: UpdateQuestionDto,
  ): Promise<QuestionTranslationRecord> {
    if (dto.locale === DEFAULT_LOCALE) {
      throw new BadRequestException(DEFAULT_LOCALE_MESSAGE);
    }

    const nonLocalizable: (keyof UpdateQuestionDto)[] = [
      'imageUrl',
      'difficulty',
      'configuration',
    ];
    if (nonLocalizable.some((field) => dto[field] !== undefined)) {
      throw new BadRequestException(LOCALIZED_FIELDS_MESSAGE);
    }

    const optionTranslations = (dto.options ?? []).map((entry) => {
      if (
        entry.id === undefined ||
        entry.content === undefined ||
        entry.imageUrl !== undefined ||
        entry.isCorrect !== undefined ||
        entry.order !== undefined
      ) {
        throw new BadRequestException(LOCALIZED_OPTION_SHAPE_MESSAGE);
      }
      return { id: entry.id, content: entry.content };
    });

    const question = await this.questionsRepository.findActiveById(id);
    if (!question) {
      throw new NotFoundException(QUESTION_NOT_FOUND_MESSAGE);
    }

    const knownIds = new Set(question.answerOptions.map((option) => option.id));
    if (optionTranslations.some((entry) => !knownIds.has(entry.id))) {
      throw new BadRequestException(OPTION_ID_UNKNOWN_MESSAGE);
    }

    const existing = await this.questionsRepository.findTitleTranslation(
      id,
      dto.locale as Language,
    );
    if (!existing && dto.title === undefined) {
      throw new BadRequestException(TRANSLATION_TITLE_REQUIRED_MESSAGE);
    }

    return this.questionsRepository.upsertTranslations({
      questionId: id,
      locale: dto.locale as Language,
      // One of the two is always defined: dto.title was just required
      // whenever no translation exists yet.
      titleWhenCreating: (dto.title ?? existing?.title) as string,
      title: dto.title,
      options: optionTranslations,
    });
  }

  /**
   * Resolves the display order for a full option payload: either every entry
   * supplies `order` (used as-is) or none does (assigned from array
   * position) — a mix is rejected (docs/04-api/admin.md §6).
   */
  private resolveOrders(entries: AnswerOptionInputDto[]): number[] {
    const provided = entries.filter((entry) => entry.order !== undefined);

    if (provided.length === 0) {
      return entries.map((_, index) => index);
    }
    if (provided.length !== entries.length) {
      throw new BadRequestException(OPTION_ORDER_ALL_OR_NONE_MESSAGE);
    }
    return entries.map((entry) => entry.order as number);
  }

  /**
   * Validates the complete option set and correct-answer configuration for
   * the question type (docs/02-domain/question.md §6-7,
   * docs/02-domain/answer-option.md §6, §8-9).
   */
  private validateOptionSet(
    type: QuestionType,
    options: OptionWrite[] | { isCorrect: boolean; order: number }[],
    configuration: unknown,
    isCorrectProvided: boolean,
    configurationProvided = false,
  ): void {
    if (options.length < MIN_OPTIONS || options.length > MAX_OPTIONS) {
      throw new BadRequestException(OPTION_COUNT_MESSAGE);
    }

    const orders = options.map((option) => option.order);
    if (new Set(orders).size !== orders.length) {
      throw new BadRequestException(OPTION_ORDER_UNIQUE_MESSAGE);
    }

    if (type === QuestionType.SINGLE_CHOICE) {
      if (configuration !== undefined || configurationProvided) {
        throw new BadRequestException(CONFIGURATION_FORBIDDEN_MESSAGE);
      }
      const correctCount = options.filter((option) => option.isCorrect).length;
      if (correctCount !== 1) {
        throw new BadRequestException(SINGLE_CHOICE_CORRECT_MESSAGE);
      }
      return;
    }

    // MATCHING: correctness lives exclusively in the configuration.
    if (isCorrectProvided) {
      throw new BadRequestException(MATCHING_IS_CORRECT_MESSAGE);
    }
    if (configuration === undefined) {
      throw new BadRequestException(CONFIGURATION_REQUIRED_MESSAGE);
    }
    this.validateMatchingConfiguration(configuration, orders);
  }

  /**
   * The MATCHING configuration is `{pairs: [{left, right}]}` where left and
   * right reference option order values, and every option participates in
   * exactly one pair (docs/02-domain/answer-option.md §9).
   */
  private validateMatchingConfiguration(
    configuration: unknown,
    orders: number[],
  ): void {
    if (
      typeof configuration !== 'object' ||
      configuration === null ||
      Array.isArray(configuration)
    ) {
      throw new BadRequestException(CONFIGURATION_INVALID_MESSAGE);
    }

    const keys = Object.keys(configuration);
    const pairs = (configuration as { pairs?: unknown }).pairs;
    if (keys.length !== 1 || !Array.isArray(pairs) || pairs.length === 0) {
      throw new BadRequestException(CONFIGURATION_INVALID_MESSAGE);
    }

    const used: number[] = [];
    for (const pair of pairs as unknown[]) {
      if (typeof pair !== 'object' || pair === null || Array.isArray(pair)) {
        throw new BadRequestException(CONFIGURATION_INVALID_MESSAGE);
      }
      const { left, right } = pair as { left?: unknown; right?: unknown };
      if (
        Object.keys(pair).length !== 2 ||
        !Number.isInteger(left) ||
        !Number.isInteger(right)
      ) {
        throw new BadRequestException(CONFIGURATION_INVALID_MESSAGE);
      }
      used.push(left as number, right as number);
    }

    const orderSet = new Set(orders);
    const everyUsedExists = used.every((order) => orderSet.has(order));
    const usedExactlyOnce = new Set(used).size === used.length;
    if (!everyUsedExists || !usedExactlyOnce || used.length !== orders.length) {
      throw new BadRequestException(CONFIGURATION_INVALID_MESSAGE);
    }
  }
}
