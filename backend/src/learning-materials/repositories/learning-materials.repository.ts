import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SortOrder } from '../../subjects/dto/list-subjects-query.dto';
import { LearningMaterialSortField } from '../dto/list-learning-materials-query.dto';

/** Learning material record as exposed through the Admin API. */
export interface LearningMaterialRecord {
  id: string;
  subjectId: string;
  topicId: string | null;
  title: string;
  slug: string;
  description: string | null;
  content: string;
  estimatedReadingTime: number | null;
  isPublished: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

/** A published material as read for the public content API. */
export interface PublishedLearningMaterialRow {
  id: string;
  subjectId: string;
  topicId: string | null;
  title: string;
  slug: string;
  description: string | null;
  content: string;
  estimatedReadingTime: number | null;
}

const MATERIAL_SELECT = {
  id: true,
  subjectId: true,
  topicId: true,
  title: true,
  slug: true,
  description: true,
  content: true,
  estimatedReadingTime: true,
  isPublished: true,
  displayOrder: true,
  createdAt: true,
  updatedAt: true,
} as const;

/**
 * A published material as listed for a whole subject. Deliberately without
 * `content`: the list exists so the browser can tell which topics have a
 * material, and shipping every body would make that a heavy request.
 */
export interface PublishedLearningMaterialSummaryRow {
  id: string;
  topicId: string | null;
  title: string;
  slug: string;
  description: string | null;
  estimatedReadingTime: number | null;
}

const PUBLIC_SELECT = {
  id: true,
  subjectId: true,
  topicId: true,
  title: true,
  slug: true,
  description: true,
  content: true,
  estimatedReadingTime: true,
} as const;

const PUBLIC_SUMMARY_SELECT = {
  id: true,
  topicId: true,
  title: true,
  slug: true,
  description: true,
  estimatedReadingTime: true,
} as const;

/**
 * Persistence for the Learning Materials module. All reads and writes target
 * non-deleted rows (`deletedAt: null`) unless a method says otherwise —
 * soft-deleted materials are invisible everywhere
 * (docs/03-database/tables.md §6).
 *
 * Slug uniqueness is scoped per subject and backed by
 * `@@unique([subjectId, slug])`, so a slug stays reserved after deletion;
 * display order is contested only among visible materials.
 */
@Injectable()
export class LearningMaterialsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findPage(params: {
    skip: number;
    take: number;
    subjectId?: string;
    topicId?: string;
    isPublished?: boolean;
    search?: string;
    sortBy: LearningMaterialSortField;
    sortOrder: SortOrder;
  }): Promise<{ items: LearningMaterialRecord[]; totalItems: number }> {
    const where: Prisma.LearningMaterialWhereInput = {
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
        : {
            OR: [
              { title: { contains: params.search, mode: 'insensitive' } },
              { slug: { contains: params.search, mode: 'insensitive' } },
            ],
          }),
    };

    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.learningMaterial.findMany({
        where,
        select: MATERIAL_SELECT,
        orderBy: { [params.sortBy]: params.sortOrder },
        skip: params.skip,
        take: params.take,
      }),
      this.prisma.learningMaterial.count({ where }),
    ]);

    return { items, totalItems };
  }

  async findActiveById(id: string): Promise<LearningMaterialRecord | null> {
    return this.prisma.learningMaterial.findFirst({
      where: { id, deletedAt: null },
      select: MATERIAL_SELECT,
    });
  }

  /**
   * The published material attached to one topic, if any. The whole ancestor
   * chain must be visible too: a material under an unpublished topic or
   * subject is not reachable, matching how questions behave.
   *
   * Ordered by displayOrder so that "the material for this topic" is a stable
   * choice even if a second one is ever added.
   */
  async findPublishedForTopic(
    topicId: string,
  ): Promise<PublishedLearningMaterialRow | null> {
    return this.prisma.learningMaterial.findFirst({
      where: {
        topicId,
        deletedAt: null,
        isPublished: true,
        topic: { deletedAt: null, isPublished: true },
        subject: { deletedAt: null, isPublished: true },
      },
      select: PUBLIC_SELECT,
      orderBy: { displayOrder: 'asc' },
    });
  }

  /**
   * Every published material of one subject, in display order. Same
   * visibility rules as {@link findPublishedForTopic}: an unpublished topic or
   * subject hides its materials.
   */
  async findPublishedForSubject(
    subjectId: string,
  ): Promise<PublishedLearningMaterialSummaryRow[]> {
    return this.prisma.learningMaterial.findMany({
      where: {
        subjectId,
        deletedAt: null,
        isPublished: true,
        subject: { deletedAt: null, isPublished: true },
        OR: [
          { topicId: null },
          { topic: { deletedAt: null, isPublished: true } },
        ],
      },
      select: PUBLIC_SUMMARY_SELECT,
      orderBy: { displayOrder: 'asc' },
    });
  }

  /** Slugs stay reserved after deletion — backed by the unique constraint. */
  async slugExistsInSubject(
    subjectId: string,
    slug: string,
    excludeId?: string,
  ): Promise<boolean> {
    const existing = await this.prisma.learningMaterial.findFirst({
      where: {
        subjectId,
        slug,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });
    return existing !== null;
  }

  /** Display order is only contested among visible materials of the subject. */
  async displayOrderExistsInSubject(
    subjectId: string,
    displayOrder: number,
    excludeId?: string,
  ): Promise<boolean> {
    const existing = await this.prisma.learningMaterial.findFirst({
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
    const result = await this.prisma.learningMaterial.aggregate({
      where: { subjectId, deletedAt: null },
      _max: { displayOrder: true },
    });
    return result._max.displayOrder;
  }

  async create(data: {
    subjectId: string;
    topicId?: string | null;
    title: string;
    slug: string;
    description?: string;
    content: string;
    estimatedReadingTime: number;
    displayOrder: number;
  }): Promise<LearningMaterialRecord> {
    return this.prisma.learningMaterial.create({
      data,
      select: MATERIAL_SELECT,
    });
  }

  async update(
    id: string,
    data: Prisma.LearningMaterialUpdateInput,
  ): Promise<LearningMaterialRecord> {
    return this.prisma.learningMaterial.update({
      where: { id },
      data,
      select: MATERIAL_SELECT,
    });
  }

  /**
   * Marks the material deleted only if it is still visible, so a repeated
   * delete reports not-found instead of silently succeeding.
   */
  async softDeleteIfActive(id: string): Promise<boolean> {
    const result = await this.prisma.learningMaterial.updateMany({
      where: { id, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    return result.count === 1;
  }
}
