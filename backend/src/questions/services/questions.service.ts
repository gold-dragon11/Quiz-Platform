import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Language, Prisma, QuestionType } from '@prisma/client';
import { SettingsService } from '../../settings/services/settings.service';
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
import { ListPublicQuestionsQueryDto } from '../dto/list-public-questions-query.dto';
import { PaginatedQuestions } from '../types/paginated-questions.type';
import {
  PaginatedPublicQuestions,
  PublicQuestion,
} from '../types/public-question.type';

/** The default locale lives on the Question row itself, not in a translation. */
const DEFAULT_LOCALE = Language.ENGLISH;

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 20;
const MIN_MATCHING_PAIRS = 2;

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
const CONFIGURATION_MIN_PAIRS_MESSAGE = `MATCHING questions require at least ${MIN_MATCHING_PAIRS} pairs.`;
const DEFAULT_LOCALE_MESSAGE =
  'locale must be a non-default locale; update the question itself for English content.';
const LOCALIZED_FIELDS_MESSAGE =
  'Only title and options can be provided together with locale.';
const LOCALIZED_OPTION_SHAPE_MESSAGE =
  'Localized options accept only id and content.';
const TRANSLATION_TITLE_REQUIRED_MESSAGE =
  'title is required when creating a new translation.';

/** One correct matching pair, expressed in option order values. */
interface MatchingPair {
  left: number;
  right: number;
}

/**
 * Question management use cases (docs/04-api/admin.md §6-7, §10,
 * docs/02-domain/question.md, docs/02-domain/answer-option.md).
 *
 * Correctness rules by type (docs/02-domain/answer-option.md §8-9):
 * - SINGLE_CHOICE — exactly one option isCorrect, no configuration;
 * - MATCHING — correctness lives in `configuration.pairs` referencing option
 *   order values; isCorrect is not accepted on options; at least two pairs,
 *   every option in exactly one pair.
 *
 * Persisted option orders are always normalized to a contiguous 0..n-1
 * sequence (docs/02-domain/answer-option.md §10): explicit order values
 * decide the ordering, array position is the fallback, and the MATCHING
 * configuration is remapped alongside so pairs keep following their options.
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
    private readonly settingsService: SettingsService,
  ) {}

  /**
   * Public question delivery (docs/04-api/questions.md §5-§8, §14):
   * published questions of a fully published topic (subject included),
   * newest first, localized with fallback. The response carries exactly
   * what taking a quiz requires — isCorrect never leaves this method, and
   * `configuration` is included for MATCHING questions only.
   */
  async listPublishedForTopic(
    topicId: string,
    query: ListPublicQuestionsQueryDto,
    userId: string,
  ): Promise<PaginatedPublicQuestions> {
    // The full ancestor publication chain: an unknown, unpublished, or
    // deleted topic — or one under an unpublished subject — is the same 404.
    if (!(await this.topicsService.publishedTopicExists(topicId))) {
      throw new NotFoundException(TOPIC_NOT_FOUND_MESSAGE);
    }

    const locale = await this.settingsService.resolveLocale(
      query.locale,
      userId,
    );
    const { items, totalItems } =
      await this.questionsRepository.findPublishedPageForTopic({
        topicId,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        locale: locale === Language.ENGLISH ? undefined : locale,
      });

    const publicItems: PublicQuestion[] = items.map((row) => ({
      id: row.id,
      type: row.type,
      title: row.translations[0]?.title ?? row.title,
      difficulty: row.difficulty,
      imageUrl: row.imageUrl,
      answerOptions: row.answerOptions.map((option) => ({
        id: option.id,
        content: option.translations[0]?.content ?? option.content,
        imageUrl: option.imageUrl,
        order: option.order,
      })),
      ...(row.type === QuestionType.MATCHING
        ? { configuration: row.configuration }
        : {}),
    }));

    return {
      items: publicItems,
      page: query.page,
      pageSize: query.pageSize,
      totalItems,
      totalPages: Math.ceil(totalItems / query.pageSize),
    };
  }

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

    const effectiveOrders = this.resolveEffectiveOrders(dto.options);
    const isCorrectProvided = dto.options.some(
      (option) => option.isCorrect !== undefined,
    );

    const merged: OptionWrite[] = dto.options.map((option, index) => {
      if (option.content === undefined) {
        throw new BadRequestException(OPTION_CONTENT_REQUIRED_MESSAGE);
      }
      return {
        content: option.content,
        imageUrl: option.imageUrl ?? null,
        isCorrect: option.isCorrect ?? false,
        order: effectiveOrders[index],
      };
    });

    let configuration: Prisma.InputJsonValue | undefined;
    let options: OptionWrite[];

    if (dto.type === QuestionType.SINGLE_CHOICE) {
      this.assertSingleChoiceRules(merged, dto.configuration !== undefined);
      options = this.normalizeOrders(merged).options;
    } else {
      this.assertMatchingOptionRules(merged, isCorrectProvided);
      if (dto.configuration === undefined) {
        throw new BadRequestException(CONFIGURATION_REQUIRED_MESSAGE);
      }
      // Pairs reference the payload's own (effective) orders and are
      // remapped to the normalized ones persisted below.
      const pairs = this.parseMatchingPairs(dto.configuration);
      this.assertValidPairs(pairs, effectiveOrders);
      const normalized = this.normalizeOrders(merged);
      options = normalized.options;
      configuration = this.remapPairs(pairs, normalized.orderMap);
    }

    return this.questionsRepository.createWithOptions({
      topicId: dto.topicId,
      type: dto.type,
      title: dto.title,
      imageUrl: dto.imageUrl,
      difficulty: dto.difficulty,
      configuration,
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

    const data: Prisma.QuestionUpdateInput = {
      ...(dto.title === undefined ? {} : { title: dto.title }),
      ...(dto.imageUrl === undefined ? {} : { imageUrl: dto.imageUrl }),
      ...(dto.difficulty === undefined ? {} : { difficulty: dto.difficulty }),
    };

    if (question.type === QuestionType.SINGLE_CHOICE) {
      if (dto.configuration !== undefined) {
        throw new BadRequestException(CONFIGURATION_FORBIDDEN_MESSAGE);
      }

      if (dto.options === undefined) {
        return this.questionsRepository.updateWithOptions(
          id,
          data,
          undefined,
          [],
        );
      }

      const { merged, deleteIds } = this.mergeOptionSet(question, dto.options);
      this.assertSingleChoiceRules(merged, false);
      const { options } = this.normalizeOrders(merged);
      return this.questionsRepository.updateWithOptions(
        id,
        data,
        options,
        deleteIds,
      );
    }

    // MATCHING — the configuration and the option set move together.
    if (dto.options === undefined) {
      if (dto.configuration !== undefined) {
        // New pairs against the persisted (already normalized) orders.
        const pairs = this.parseMatchingPairs(dto.configuration);
        this.assertValidPairs(
          pairs,
          question.answerOptions.map((option) => option.order),
        );
        data.configuration = dto.configuration as Prisma.InputJsonValue;
      }
      return this.questionsRepository.updateWithOptions(
        id,
        data,
        undefined,
        [],
      );
    }

    const isCorrectProvided = dto.options.some(
      (entry) => entry.isCorrect !== undefined,
    );
    const { merged, deleteIds, effectiveOrders } = this.mergeOptionSetDetailed(
      question,
      dto.options,
    );
    this.assertMatchingOptionRules(merged, isCorrectProvided);

    let pairs: MatchingPair[];
    if (dto.configuration !== undefined) {
      // Supplied pairs reference the payload's effective orders.
      pairs = this.parseMatchingPairs(dto.configuration);
      this.assertValidPairs(pairs, effectiveOrders);
      const normalized = this.normalizeOrders(merged);
      const configuration = this.remapPairs(pairs, normalized.orderMap);
      return this.questionsRepository.updateWithOptions(
        id,
        { ...data, configuration },
        normalized.options,
        deleteIds,
      );
    }

    // Configuration omitted: the stored pairs follow their options — each
    // stored order is translated through the option id to its new order.
    // A pair whose option was deleted no longer matches every option and is
    // rejected, exactly like any other invalid structure.
    pairs = this.parseMatchingPairs(question.configuration ?? undefined);
    const normalized = this.normalizeOrders(merged);
    const idByStoredOrder = new Map(
      question.answerOptions.map((option) => [option.order, option.id]),
    );
    const newOrderById = new Map<string, number>();
    normalized.options.forEach((option, index) => {
      if (option.id) {
        newOrderById.set(option.id, normalized.options[index].order);
      }
    });

    const followedPairs: MatchingPair[] = pairs.map((pair) => {
      const leftId = idByStoredOrder.get(pair.left);
      const rightId = idByStoredOrder.get(pair.right);
      const left = leftId !== undefined ? newOrderById.get(leftId) : undefined;
      const right =
        rightId !== undefined ? newOrderById.get(rightId) : undefined;
      if (left === undefined || right === undefined) {
        throw new BadRequestException(CONFIGURATION_INVALID_MESSAGE);
      }
      return { left, right };
    });
    this.assertValidPairs(
      followedPairs,
      normalized.options.map((option) => option.order),
    );

    return this.questionsRepository.updateWithOptions(
      id,
      {
        ...data,
        configuration: this.pairsToJson(followedPairs),
      },
      normalized.options,
      deleteIds,
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
      const orders = question.answerOptions.map((option) => option.order);
      if (
        question.answerOptions.length < MIN_OPTIONS ||
        question.answerOptions.length > MAX_OPTIONS
      ) {
        throw new BadRequestException(OPTION_COUNT_MESSAGE);
      }
      if (question.type === QuestionType.SINGLE_CHOICE) {
        this.assertSingleChoiceRules(question.answerOptions, false);
      } else {
        const pairs = this.parseMatchingPairs(
          question.configuration ?? undefined,
        );
        this.assertValidPairs(pairs, orders);
      }
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

  /** Merge-by-id bookkeeping shared by both question types. */
  private mergeOptionSet(
    question: QuestionRecord,
    entries: AnswerOptionInputDto[],
  ): { merged: OptionWrite[]; deleteIds: string[] } {
    const { merged, deleteIds } = this.mergeOptionSetDetailed(
      question,
      entries,
    );
    return { merged, deleteIds };
  }

  /**
   * Applies merge-by-id semantics (docs/04-api/admin.md §6): the payload is
   * the complete desired option set. Returns the merged writes carrying
   * their *effective* orders — normalization happens afterwards.
   */
  private mergeOptionSetDetailed(
    question: QuestionRecord,
    entries: AnswerOptionInputDto[],
  ): {
    merged: OptionWrite[];
    deleteIds: string[];
    effectiveOrders: number[];
  } {
    const existingById = new Map(
      question.answerOptions.map((option) => [option.id, option]),
    );

    const seenIds = new Set<string>();
    for (const entry of entries) {
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

    if (entries.length < MIN_OPTIONS || entries.length > MAX_OPTIONS) {
      throw new BadRequestException(OPTION_COUNT_MESSAGE);
    }

    const effectiveOrders = this.resolveEffectiveOrders(entries);

    const merged: OptionWrite[] = entries.map((entry, index) => {
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
        order: effectiveOrders[index],
      };
    });

    const deleteIds = question.answerOptions
      .map((option) => option.id)
      .filter((optionId) => !seenIds.has(optionId));

    return { merged, deleteIds, effectiveOrders };
  }

  /**
   * Resolves the effective ordering of a full option payload: either every
   * entry supplies `order` (used as the ordering key) or none does (array
   * position) — a mix is rejected, as are duplicates
   * (docs/04-api/admin.md §6).
   */
  private resolveEffectiveOrders(entries: AnswerOptionInputDto[]): number[] {
    const provided = entries.filter((entry) => entry.order !== undefined);

    let orders: number[];
    if (provided.length === 0) {
      orders = entries.map((_, index) => index);
    } else if (provided.length !== entries.length) {
      throw new BadRequestException(OPTION_ORDER_ALL_OR_NONE_MESSAGE);
    } else {
      orders = entries.map((entry) => entry.order as number);
    }

    if (new Set(orders).size !== orders.length) {
      throw new BadRequestException(OPTION_ORDER_UNIQUE_MESSAGE);
    }
    return orders;
  }

  /**
   * Normalizes persisted orders to a contiguous 0..n-1 sequence
   * (docs/02-domain/answer-option.md §10): options are sorted by their
   * effective order and re-numbered. `orderMap` translates effective orders
   * to normalized ones for configuration remapping.
   */
  private normalizeOrders(merged: OptionWrite[]): {
    options: OptionWrite[];
    orderMap: Map<number, number>;
  } {
    const sorted = [...merged].sort((a, b) => a.order - b.order);
    const orderMap = new Map<number, number>();
    const options = sorted.map((option, index) => {
      orderMap.set(option.order, index);
      return { ...option, order: index };
    });
    return { options, orderMap };
  }

  private assertSingleChoiceRules(
    options: { isCorrect: boolean }[],
    configurationProvided: boolean,
  ): void {
    if (configurationProvided) {
      throw new BadRequestException(CONFIGURATION_FORBIDDEN_MESSAGE);
    }
    const correctCount = options.filter((option) => option.isCorrect).length;
    if (correctCount !== 1) {
      throw new BadRequestException(SINGLE_CHOICE_CORRECT_MESSAGE);
    }
  }

  private assertMatchingOptionRules(
    options: OptionWrite[],
    isCorrectProvided: boolean,
  ): void {
    if (isCorrectProvided) {
      throw new BadRequestException(MATCHING_IS_CORRECT_MESSAGE);
    }
    void options;
  }

  /**
   * Parses `{pairs: [{left, right}]}` strictly — any structural deviation is
   * rejected (docs/02-domain/answer-option.md §9).
   */
  private parseMatchingPairs(configuration: unknown): MatchingPair[] {
    if (configuration === undefined) {
      throw new BadRequestException(CONFIGURATION_REQUIRED_MESSAGE);
    }
    if (
      typeof configuration !== 'object' ||
      configuration === null ||
      Array.isArray(configuration)
    ) {
      throw new BadRequestException(CONFIGURATION_INVALID_MESSAGE);
    }

    const keys = Object.keys(configuration);
    const pairs = (configuration as { pairs?: unknown }).pairs;
    if (keys.length !== 1 || !Array.isArray(pairs)) {
      throw new BadRequestException(CONFIGURATION_INVALID_MESSAGE);
    }

    return pairs.map((pair): MatchingPair => {
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
      return { left: left as number, right: right as number };
    });
  }

  /**
   * Validates matching pairs against an option order set
   * (docs/02-domain/answer-option.md §9): at least two pairs; no self pair;
   * no duplicate pair; left and right sides never overlap; every option
   * order appears in exactly one pair.
   */
  private assertValidPairs(pairs: MatchingPair[], orders: number[]): void {
    if (pairs.length < MIN_MATCHING_PAIRS) {
      throw new BadRequestException(CONFIGURATION_MIN_PAIRS_MESSAGE);
    }

    const lefts = pairs.map((pair) => pair.left);
    const rights = pairs.map((pair) => pair.right);

    if (pairs.some((pair) => pair.left === pair.right)) {
      throw new BadRequestException(CONFIGURATION_INVALID_MESSAGE);
    }
    const pairKeys = pairs.map((pair) => `${pair.left}:${pair.right}`);
    if (new Set(pairKeys).size !== pairKeys.length) {
      throw new BadRequestException(CONFIGURATION_INVALID_MESSAGE);
    }
    const leftSet = new Set(lefts);
    const rightSet = new Set(rights);
    if (rights.some((order) => leftSet.has(order))) {
      throw new BadRequestException(CONFIGURATION_INVALID_MESSAGE);
    }
    if (leftSet.size !== lefts.length || rightSet.size !== rights.length) {
      throw new BadRequestException(CONFIGURATION_INVALID_MESSAGE);
    }

    const used = [...lefts, ...rights];
    const orderSet = new Set(orders);
    const everyUsedExists = used.every((order) => orderSet.has(order));
    if (!everyUsedExists || used.length !== orders.length) {
      throw new BadRequestException(CONFIGURATION_INVALID_MESSAGE);
    }
  }

  /** Remaps pair orders through the effective→normalized order map. */
  private remapPairs(
    pairs: MatchingPair[],
    orderMap: Map<number, number>,
  ): Prisma.InputJsonValue {
    return this.pairsToJson(
      pairs.map((pair) => ({
        left: orderMap.get(pair.left) as number,
        right: orderMap.get(pair.right) as number,
      })),
    );
  }

  private pairsToJson(pairs: MatchingPair[]): Prisma.InputJsonValue {
    return {
      pairs: pairs.map((pair) => ({ left: pair.left, right: pair.right })),
    };
  }
}
