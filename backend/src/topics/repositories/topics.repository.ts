import { Injectable } from '@nestjs/common';
import { Language, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SortOrder } from '../../subjects/dto/list-subjects-query.dto';
import { TopicSortField } from '../dto/list-topics-query.dto';

/** Default-locale topic record as exposed through the Admin API. */
export interface TopicRecord {
  id: string;
  subjectId: string;
  name: string;
  slug: string;
  description: string | null;
  isPublished: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

/** One localized topic record (docs/02-domain/topic.md §9). */
export interface TopicTranslationRecord {
  locale: Language;
  name: string;
  description: string | null;
}

/**
 * A published topic with its (optional) translation for one locale, as read
 * for the public catalog (docs/04-api/questions.md §4).
 */
export interface PublishedTopicRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  displayOrder: number;
  translations: { name: string; description: string | null }[];
}

const TOPIC_SELECT = {
  id: true,
  subjectId: true,
  name: true,
  slug: true,
  description: true,
  isPublished: true,
  displayOrder: true,
  createdAt: true,
  updatedAt: true,
} as const;

/**
 * Persistence for the Topics module. All reads and writes target non-deleted
 * rows (`deletedAt: null`) unless a method states otherwise — soft-deleted
 * topics are invisible everywhere (docs/03-database/tables.md §6).
 *
 * Uniqueness is scoped per subject (docs/02-domain/topic.md §5-6): name and
 * slug reservation checks span deleted topics of the same subject, while
 * display order is only contested among visible ones.
 */
@Injectable()
export class TopicsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findPage(params: {
    skip: number;
    take: number;
    subjectId?: string;
    isPublished?: boolean;
    search?: string;
    sortBy: TopicSortField;
    sortOrder: SortOrder;
  }): Promise<{ items: TopicRecord[]; totalItems: number }> {
    const where: Prisma.TopicWhereInput = {
      deletedAt: null,
      ...(params.subjectId === undefined
        ? {}
        : { subjectId: params.subjectId }),
      ...(params.isPublished === undefined
        ? {}
        : { isPublished: params.isPublished }),
      ...(params.search === undefined
        ? {}
        : {
            OR: [
              { name: { contains: params.search, mode: 'insensitive' } },
              { slug: { contains: params.search, mode: 'insensitive' } },
            ],
          }),
    };

    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.topic.findMany({
        where,
        select: TOPIC_SELECT,
        orderBy: { [params.sortBy]: params.sortOrder },
        skip: params.skip,
        take: params.take,
      }),
      this.prisma.topic.count({ where }),
    ]);

    return { items, totalItems };
  }

  async findActiveById(id: string): Promise<TopicRecord | null> {
    return this.prisma.topic.findFirst({
      where: { id, deletedAt: null },
      select: TOPIC_SELECT,
    });
  }

  /**
   * Whether a published, non-deleted topic with this id exists under a
   * published, non-deleted subject — the full ancestor publication chain
   * (docs/04-api/questions.md §12).
   */
  async publishedExistsWithPublishedSubject(id: string): Promise<boolean> {
    const topic = await this.prisma.topic.findFirst({
      where: {
        id,
        deletedAt: null,
        isPublished: true,
        subject: { deletedAt: null, isPublished: true },
      },
      select: { id: true },
    });
    return topic !== null;
  }

  /**
   * Published, non-deleted topics of one subject for the public catalog,
   * displayOrder ascending (docs/04-api/questions.md §4). When `locale` is
   * given the matching translation rides along for the service to merge.
   */
  async findPublishedForSubject(
    subjectId: string,
    locale?: Language,
  ): Promise<PublishedTopicRow[]> {
    return this.prisma.topic.findMany({
      where: { subjectId, deletedAt: null, isPublished: true },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        displayOrder: true,
        translations: {
          where: locale === undefined ? { locale: { in: [] } } : { locale },
          select: { name: true, description: true },
        },
      },
      orderBy: { displayOrder: 'asc' },
    });
  }

  /** Names stay reserved after deletion — the check spans deleted topics. */
  async nameExistsInSubject(
    subjectId: string,
    name: string,
    excludeId?: string,
  ): Promise<boolean> {
    const existing = await this.prisma.topic.findFirst({
      where: {
        subjectId,
        name,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });
    return existing !== null;
  }

  /**
   * Slugs stay reserved after deletion — backed by the database constraint
   * @@unique([subjectId, slug]), which spans deleted rows by nature.
   */
  async slugExistsInSubject(
    subjectId: string,
    slug: string,
    excludeId?: string,
  ): Promise<boolean> {
    const existing = await this.prisma.topic.findFirst({
      where: {
        subjectId,
        slug,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });
    return existing !== null;
  }

  /** Display order is only contested among visible topics of the subject. */
  async displayOrderExistsInSubject(
    subjectId: string,
    displayOrder: number,
    excludeId?: string,
  ): Promise<boolean> {
    const existing = await this.prisma.topic.findFirst({
      where: {
        subjectId,
        displayOrder,
        deletedAt: null,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });
    return existing !== null;
  }

  async maxDisplayOrderInSubject(subjectId: string): Promise<number | null> {
    const result = await this.prisma.topic.aggregate({
      where: { subjectId, deletedAt: null },
      _max: { displayOrder: true },
    });
    return result._max.displayOrder;
  }

  async create(data: {
    subjectId: string;
    name: string;
    slug: string;
    description?: string;
    displayOrder: number;
  }): Promise<TopicRecord> {
    return this.prisma.topic.create({ data, select: TOPIC_SELECT });
  }

  async update(
    id: string,
    data: Prisma.TopicUpdateInput,
  ): Promise<TopicRecord> {
    return this.prisma.topic.update({
      where: { id },
      data,
      select: TOPIC_SELECT,
    });
  }

  /**
   * Marks the topic deleted only if it is still visible, so a repeated delete
   * of the same id reports not-found instead of silently succeeding.
   */
  async softDeleteIfActive(id: string): Promise<boolean> {
    const result = await this.prisma.topic.updateMany({
      where: { id, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    return result.count === 1;
  }

  async findTranslation(
    topicId: string,
    locale: Language,
  ): Promise<TopicTranslationRecord | null> {
    return this.prisma.topicTranslation.findUnique({
      where: { topicId_locale: { topicId, locale } },
      select: { locale: true, name: true, description: true },
    });
  }

  /**
   * Creates or updates the one translation row per topic per locale
   * (@@unique([topicId, locale])). Prisma validates both branches of an
   * upsert, so the create branch always needs a concrete name — the service
   * passes `nameWhenCreating` (the supplied name, or the existing row's name
   * when merge-updating without one).
   */
  async upsertTranslation(params: {
    topicId: string;
    locale: Language;
    nameWhenCreating: string;
    name?: string;
    description?: string | null;
  }): Promise<TopicTranslationRecord> {
    const { topicId, locale, nameWhenCreating, name, description } = params;

    return this.prisma.topicTranslation.upsert({
      where: { topicId_locale: { topicId, locale } },
      create: {
        topicId,
        locale,
        name: nameWhenCreating,
        ...(description === undefined ? {} : { description }),
      },
      update: {
        ...(name === undefined ? {} : { name }),
        ...(description === undefined ? {} : { description }),
      },
      select: { locale: true, name: true, description: true },
    });
  }
}
