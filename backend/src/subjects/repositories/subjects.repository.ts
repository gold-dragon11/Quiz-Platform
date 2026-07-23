import { Injectable } from '@nestjs/common';
import { Language, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SortOrder, SubjectSortField } from '../dto/list-subjects-query.dto';

/** Default-locale subject record as exposed through the Admin API. */
export interface SubjectRecord {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  isPublished: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

/** One localized subject record (docs/02-domain/subject.md §9). */
export interface SubjectTranslationRecord {
  locale: Language;
  name: string;
  description: string | null;
}

const SUBJECT_SELECT = {
  id: true,
  name: true,
  slug: true,
  description: true,
  icon: true,
  color: true,
  isPublished: true,
  displayOrder: true,
  createdAt: true,
  updatedAt: true,
} as const;

/**
 * Persistence for the Subjects module. All reads and writes target
 * non-deleted rows (`deletedAt: null`) unless a method states otherwise —
 * soft-deleted subjects are invisible everywhere
 * (docs/03-database/tables.md §6).
 */
@Injectable()
export class SubjectsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findPage(params: {
    skip: number;
    take: number;
    isPublished?: boolean;
    search?: string;
    sortBy: SubjectSortField;
    sortOrder: SortOrder;
  }): Promise<{ items: SubjectRecord[]; totalItems: number }> {
    const where: Prisma.SubjectWhereInput = {
      deletedAt: null,
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
      this.prisma.subject.findMany({
        where,
        select: SUBJECT_SELECT,
        orderBy: { [params.sortBy]: params.sortOrder },
        skip: params.skip,
        take: params.take,
      }),
      this.prisma.subject.count({ where }),
    ]);

    return { items, totalItems };
  }

  async findActiveById(id: string): Promise<SubjectRecord | null> {
    return this.prisma.subject.findFirst({
      where: { id, deletedAt: null },
      select: SUBJECT_SELECT,
    });
  }

  /**
   * Name uniqueness spans deleted subjects too — names stay reserved after
   * deletion, exactly like slugs (whose reservation the DB unique constraint
   * already enforces).
   */
  async nameExists(name: string, excludeId?: string): Promise<boolean> {
    const existing = await this.prisma.subject.findFirst({
      where: { name, ...(excludeId ? { id: { not: excludeId } } : {}) },
      select: { id: true },
    });
    return existing !== null;
  }

  async slugExists(slug: string, excludeId?: string): Promise<boolean> {
    const existing = await this.prisma.subject.findFirst({
      where: { slug, ...(excludeId ? { id: { not: excludeId } } : {}) },
      select: { id: true },
    });
    return existing !== null;
  }

  /** Display order is only contested among visible (non-deleted) subjects. */
  async displayOrderExists(
    displayOrder: number,
    excludeId?: string,
  ): Promise<boolean> {
    const existing = await this.prisma.subject.findFirst({
      where: {
        displayOrder,
        deletedAt: null,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });
    return existing !== null;
  }

  async maxDisplayOrder(): Promise<number | null> {
    const result = await this.prisma.subject.aggregate({
      where: { deletedAt: null },
      _max: { displayOrder: true },
    });
    return result._max.displayOrder;
  }

  async create(data: {
    name: string;
    slug: string;
    description?: string;
    icon?: string;
    color?: string;
    displayOrder: number;
  }): Promise<SubjectRecord> {
    return this.prisma.subject.create({ data, select: SUBJECT_SELECT });
  }

  async update(
    id: string,
    data: Prisma.SubjectUpdateInput,
  ): Promise<SubjectRecord> {
    return this.prisma.subject.update({
      where: { id },
      data,
      select: SUBJECT_SELECT,
    });
  }

  /**
   * Marks the subject deleted only if it is still visible, so a repeated
   * delete of the same id reports not-found instead of silently succeeding.
   */
  async softDeleteIfActive(id: string): Promise<boolean> {
    const result = await this.prisma.subject.updateMany({
      where: { id, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    return result.count === 1;
  }

  async findTranslation(
    subjectId: string,
    locale: Language,
  ): Promise<SubjectTranslationRecord | null> {
    return this.prisma.subjectTranslation.findUnique({
      where: { subjectId_locale: { subjectId, locale } },
      select: { locale: true, name: true, description: true },
    });
  }

  /**
   * Creates or updates the one translation row per subject per locale
   * (@@unique([subjectId, locale])). Prisma validates both branches of an
   * upsert, so the create branch always needs a concrete name — the service
   * passes `nameWhenCreating` (the supplied name, or the existing row's name
   * when merge-updating without one).
   */
  async upsertTranslation(params: {
    subjectId: string;
    locale: Language;
    nameWhenCreating: string;
    name?: string;
    description?: string | null;
  }): Promise<SubjectTranslationRecord> {
    const { subjectId, locale, nameWhenCreating, name, description } = params;

    return this.prisma.subjectTranslation.upsert({
      where: { subjectId_locale: { subjectId, locale } },
      create: {
        subjectId,
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
