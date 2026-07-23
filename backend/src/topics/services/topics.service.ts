import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Language, Prisma } from '@prisma/client';
import { SubjectsService } from '../../subjects/services/subjects.service';
import { CreateTopicDto } from '../dto/create-topic.dto';
import { ListTopicsQueryDto } from '../dto/list-topics-query.dto';
import { UpdateTopicDto } from '../dto/update-topic.dto';
import {
  TopicRecord,
  TopicTranslationRecord,
  TopicsRepository,
} from '../repositories/topics.repository';
import { PaginatedTopics } from '../types/paginated-topics.type';

/** The default locale lives on the Topic row itself, not in a translation. */
const DEFAULT_LOCALE = Language.ENGLISH;

const TOPIC_NOT_FOUND_MESSAGE = 'Topic not found.';
const SUBJECT_NOT_FOUND_MESSAGE = 'Subject not found.';
const NAME_CONFLICT_MESSAGE =
  'A topic with this name already exists in this subject.';
const SLUG_CONFLICT_MESSAGE =
  'A topic with this slug already exists in this subject.';
const DISPLAY_ORDER_CONFLICT_MESSAGE =
  'A topic with this display order already exists in this subject.';
const DEFAULT_LOCALE_MESSAGE =
  'locale must be a non-default locale; update the topic itself for English content.';
const LOCALIZED_FIELDS_MESSAGE =
  'Only name and description can be provided together with locale.';
const TRANSLATION_NAME_REQUIRED_MESSAGE =
  'name is required when creating a new translation.';

/**
 * Topic management use cases (docs/04-api/admin.md §5,
 * docs/02-domain/topic.md).
 *
 * All uniqueness rules are scoped to the parent subject: name (service-level,
 * spans deleted topics), slug (backed by @@unique([subjectId, slug])), and
 * display order (service-level, visible topics only).
 */
@Injectable()
export class TopicsService {
  constructor(
    private readonly topicsRepository: TopicsRepository,
    private readonly subjectsService: SubjectsService,
  ) {}

  async list(query: ListTopicsQueryDto): Promise<PaginatedTopics> {
    const { items, totalItems } = await this.topicsRepository.findPage({
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      subjectId: query.subjectId,
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

  async create(dto: CreateTopicDto): Promise<TopicRecord> {
    // The parent must exist and not be soft-deleted
    // (docs/02-domain/topic.md §6).
    if (!(await this.subjectsService.subjectExists(dto.subjectId))) {
      throw new NotFoundException(SUBJECT_NOT_FOUND_MESSAGE);
    }

    await this.assertNameAvailable(dto.subjectId, dto.name);
    await this.assertSlugAvailable(dto.subjectId, dto.slug);

    let displayOrder = dto.displayOrder;
    if (displayOrder === undefined) {
      // Append at the end of the subject (docs/04-api/admin.md §5).
      const max = await this.topicsRepository.maxDisplayOrderInSubject(
        dto.subjectId,
      );
      displayOrder = max === null ? 0 : max + 1;
    } else {
      await this.assertDisplayOrderAvailable(dto.subjectId, displayOrder);
    }

    try {
      return await this.topicsRepository.create({
        subjectId: dto.subjectId,
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        displayOrder,
      });
    } catch (error) {
      // Two concurrent creates can pass the pre-check; the database
      // [subjectId, slug] constraint is the backstop. Same 409.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(SLUG_CONFLICT_MESSAGE);
      }
      throw error;
    }
  }

  async update(
    id: string,
    dto: UpdateTopicDto,
  ): Promise<TopicRecord | TopicTranslationRecord> {
    if (dto.locale !== undefined) {
      return this.upsertTranslation(id, dto);
    }

    const topic = await this.topicsRepository.findActiveById(id);
    if (!topic) {
      throw new NotFoundException(TOPIC_NOT_FOUND_MESSAGE);
    }

    if (dto.name !== undefined && dto.name !== topic.name) {
      await this.assertNameAvailable(topic.subjectId, dto.name, id);
    }
    if (dto.slug !== undefined && dto.slug !== topic.slug) {
      await this.assertSlugAvailable(topic.subjectId, dto.slug, id);
    }
    if (
      dto.displayOrder !== undefined &&
      dto.displayOrder !== topic.displayOrder
    ) {
      await this.assertDisplayOrderAvailable(
        topic.subjectId,
        dto.displayOrder,
        id,
      );
    }

    // Merge semantics (docs/04-api/admin.md §5): only supplied fields change;
    // explicit null clears the nullable description.
    const data: Prisma.TopicUpdateInput = {
      ...(dto.name === undefined ? {} : { name: dto.name }),
      ...(dto.slug === undefined ? {} : { slug: dto.slug }),
      ...(dto.description === undefined
        ? {}
        : { description: dto.description }),
      ...(dto.isPublished === undefined
        ? {}
        : { isPublished: dto.isPublished }),
      ...(dto.displayOrder === undefined
        ? {}
        : { displayOrder: dto.displayOrder }),
    };

    return this.topicsRepository.update(id, data);
  }

  async remove(id: string): Promise<void> {
    const deleted = await this.topicsRepository.softDeleteIfActive(id);
    if (!deleted) {
      throw new NotFoundException(TOPIC_NOT_FOUND_MESSAGE);
    }
  }

  /**
   * PUT with `locale` targets the TopicTranslation for that locale
   * (docs/04-api/admin.md §5). Only name and description are localizable
   * (docs/02-domain/topic.md §9); English content lives on the Topic.
   */
  private async upsertTranslation(
    id: string,
    dto: UpdateTopicDto,
  ): Promise<TopicTranslationRecord> {
    if (dto.locale === DEFAULT_LOCALE) {
      throw new BadRequestException(DEFAULT_LOCALE_MESSAGE);
    }

    const nonLocalizable: (keyof UpdateTopicDto)[] = [
      'slug',
      'isPublished',
      'displayOrder',
    ];
    if (nonLocalizable.some((field) => dto[field] !== undefined)) {
      throw new BadRequestException(LOCALIZED_FIELDS_MESSAGE);
    }

    const topic = await this.topicsRepository.findActiveById(id);
    if (!topic) {
      throw new NotFoundException(TOPIC_NOT_FOUND_MESSAGE);
    }

    const existing = await this.topicsRepository.findTranslation(
      id,
      dto.locale as Language,
    );
    if (!existing && dto.name === undefined) {
      throw new BadRequestException(TRANSLATION_NAME_REQUIRED_MESSAGE);
    }

    return this.topicsRepository.upsertTranslation({
      topicId: id,
      locale: dto.locale as Language,
      // One of the two is always defined: dto.name was just required
      // whenever no translation exists yet.
      nameWhenCreating: (dto.name ?? existing?.name) as string,
      name: dto.name,
      description: dto.description,
    });
  }

  private async assertNameAvailable(
    subjectId: string,
    name: string,
    excludeId?: string,
  ): Promise<void> {
    if (
      await this.topicsRepository.nameExistsInSubject(
        subjectId,
        name,
        excludeId,
      )
    ) {
      throw new ConflictException(NAME_CONFLICT_MESSAGE);
    }
  }

  private async assertSlugAvailable(
    subjectId: string,
    slug: string,
    excludeId?: string,
  ): Promise<void> {
    if (
      await this.topicsRepository.slugExistsInSubject(
        subjectId,
        slug,
        excludeId,
      )
    ) {
      throw new ConflictException(SLUG_CONFLICT_MESSAGE);
    }
  }

  private async assertDisplayOrderAvailable(
    subjectId: string,
    displayOrder: number,
    excludeId?: string,
  ): Promise<void> {
    if (
      await this.topicsRepository.displayOrderExistsInSubject(
        subjectId,
        displayOrder,
        excludeId,
      )
    ) {
      throw new ConflictException(DISPLAY_ORDER_CONFLICT_MESSAGE);
    }
  }
}
