import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Language, Prisma } from '@prisma/client';
import { SettingsService } from '../../settings/services/settings.service';
import { CreateSubjectDto } from '../dto/create-subject.dto';
import { ListSubjectsQueryDto } from '../dto/list-subjects-query.dto';
import { UpdateSubjectDto } from '../dto/update-subject.dto';
import {
  SubjectRecord,
  SubjectTranslationRecord,
  SubjectsRepository,
} from '../repositories/subjects.repository';
import { PaginatedSubjects } from '../types/paginated-subjects.type';
import { PublicSubject } from '../types/public-subject.type';

/** The default locale lives on the Subject row itself, not in a translation. */
const DEFAULT_LOCALE = Language.ENGLISH;

const SUBJECT_NOT_FOUND_MESSAGE = 'Subject not found.';
const NAME_CONFLICT_MESSAGE = 'A subject with this name already exists.';
const SLUG_CONFLICT_MESSAGE = 'A subject with this slug already exists.';
const DISPLAY_ORDER_CONFLICT_MESSAGE =
  'A subject with this display order already exists.';
const DEFAULT_LOCALE_MESSAGE =
  'locale must be a non-default locale; update the subject itself for English content.';
const LOCALIZED_FIELDS_MESSAGE =
  'Only name and description can be provided together with locale.';
const TRANSLATION_NAME_REQUIRED_MESSAGE =
  'name is required when creating a new translation.';

/**
 * Subject management use cases (docs/04-api/admin.md §4,
 * docs/02-domain/subject.md).
 *
 * Uniqueness rules enforced here rather than by the database (per the
 * documented decisions): name is unique including soft-deleted subjects,
 * display order is unique among visible subjects. Slug uniqueness is backed
 * by the database constraint and pre-checked for a clean 409.
 */
@Injectable()
export class SubjectsService {
  constructor(
    private readonly subjectsRepository: SubjectsRepository,
    private readonly settingsService: SettingsService,
  ) {}

  /**
   * Public catalog (docs/04-api/questions.md §4): published, non-deleted
   * subjects in display order, localized with fallback to the default-locale
   * values stored on the subject itself.
   */
  async listPublished(
    requestedLocale: string | undefined,
    userId: string,
  ): Promise<PublicSubject[]> {
    const locale = await this.settingsService.resolveLocale(
      requestedLocale,
      userId,
    );
    const rows = await this.subjectsRepository.findPublished(
      locale === Language.ENGLISH ? undefined : locale,
    );

    return rows.map((row) => {
      const translation = row.translations[0];
      return {
        id: row.id,
        name: translation?.name ?? row.name,
        slug: row.slug,
        description: translation?.description ?? row.description,
        icon: row.icon,
        color: row.color,
      };
    });
  }

  /**
   * Whether a published, non-deleted subject with this id exists. Public
   * interface for the Topics module's ancestor checks
   * (docs/04-api/questions.md §4).
   */
  async publishedSubjectExists(id: string): Promise<boolean> {
    return this.subjectsRepository.publishedExists(id);
  }

  /**
   * Whether a visible (non-deleted) subject with this id exists. Public
   * interface for other modules (docs/06-backend/architecture.md §11) — the
   * Topics module uses it to validate the parent subject.
   */
  async subjectExists(id: string): Promise<boolean> {
    const subject = await this.subjectsRepository.findActiveById(id);
    return subject !== null;
  }

  async list(query: ListSubjectsQueryDto): Promise<PaginatedSubjects> {
    const { items, totalItems } = await this.subjectsRepository.findPage({
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
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

  async create(dto: CreateSubjectDto): Promise<SubjectRecord> {
    await this.assertNameAvailable(dto.name);
    await this.assertSlugAvailable(dto.slug);

    let displayOrder = dto.displayOrder;
    if (displayOrder === undefined) {
      // Append at the end (docs/04-api/admin.md §4).
      const max = await this.subjectsRepository.maxDisplayOrder();
      displayOrder = max === null ? 0 : max + 1;
    } else {
      await this.assertDisplayOrderAvailable(displayOrder);
    }

    try {
      return await this.subjectsRepository.create({
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        icon: dto.icon,
        color: dto.color,
        displayOrder,
      });
    } catch (error) {
      // Two concurrent creates can pass the pre-check; the database slug
      // constraint is the backstop. Surface it as the same 409.
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
    dto: UpdateSubjectDto,
  ): Promise<SubjectRecord | SubjectTranslationRecord> {
    if (dto.locale !== undefined) {
      return this.upsertTranslation(id, dto);
    }

    const subject = await this.subjectsRepository.findActiveById(id);
    if (!subject) {
      throw new NotFoundException(SUBJECT_NOT_FOUND_MESSAGE);
    }

    if (dto.name !== undefined && dto.name !== subject.name) {
      await this.assertNameAvailable(dto.name, id);
    }
    if (dto.slug !== undefined && dto.slug !== subject.slug) {
      await this.assertSlugAvailable(dto.slug, id);
    }
    if (
      dto.displayOrder !== undefined &&
      dto.displayOrder !== subject.displayOrder
    ) {
      await this.assertDisplayOrderAvailable(dto.displayOrder, id);
    }

    // Merge semantics (docs/04-api/admin.md §4): only supplied fields change;
    // explicit null clears a nullable field.
    const data: Prisma.SubjectUpdateInput = {
      ...(dto.name === undefined ? {} : { name: dto.name }),
      ...(dto.slug === undefined ? {} : { slug: dto.slug }),
      ...(dto.description === undefined
        ? {}
        : { description: dto.description }),
      ...(dto.icon === undefined ? {} : { icon: dto.icon }),
      ...(dto.color === undefined ? {} : { color: dto.color }),
      ...(dto.isPublished === undefined
        ? {}
        : { isPublished: dto.isPublished }),
      ...(dto.displayOrder === undefined
        ? {}
        : { displayOrder: dto.displayOrder }),
    };

    return this.subjectsRepository.update(id, data);
  }

  async remove(id: string): Promise<void> {
    const deleted = await this.subjectsRepository.softDeleteIfActive(id);
    if (!deleted) {
      throw new NotFoundException(SUBJECT_NOT_FOUND_MESSAGE);
    }
  }

  /**
   * PUT with `locale` targets the SubjectTranslation for that locale
   * (docs/04-api/admin.md §4). Only name and description are localizable
   * (docs/02-domain/subject.md §9); English content lives on the Subject.
   */
  private async upsertTranslation(
    id: string,
    dto: UpdateSubjectDto,
  ): Promise<SubjectTranslationRecord> {
    if (dto.locale === DEFAULT_LOCALE) {
      throw new BadRequestException(DEFAULT_LOCALE_MESSAGE);
    }

    const nonLocalizable: (keyof UpdateSubjectDto)[] = [
      'slug',
      'icon',
      'color',
      'isPublished',
      'displayOrder',
    ];
    if (nonLocalizable.some((field) => dto[field] !== undefined)) {
      throw new BadRequestException(LOCALIZED_FIELDS_MESSAGE);
    }

    const subject = await this.subjectsRepository.findActiveById(id);
    if (!subject) {
      throw new NotFoundException(SUBJECT_NOT_FOUND_MESSAGE);
    }

    const existing = await this.subjectsRepository.findTranslation(
      id,
      dto.locale as Language,
    );
    if (!existing && dto.name === undefined) {
      throw new BadRequestException(TRANSLATION_NAME_REQUIRED_MESSAGE);
    }

    return this.subjectsRepository.upsertTranslation({
      subjectId: id,
      locale: dto.locale as Language,
      // One of the two is always defined: dto.name was just required
      // whenever no translation exists yet.
      nameWhenCreating: (dto.name ?? existing?.name) as string,
      name: dto.name,
      description: dto.description,
    });
  }

  private async assertNameAvailable(
    name: string,
    excludeId?: string,
  ): Promise<void> {
    if (await this.subjectsRepository.nameExists(name, excludeId)) {
      throw new ConflictException(NAME_CONFLICT_MESSAGE);
    }
  }

  private async assertSlugAvailable(
    slug: string,
    excludeId?: string,
  ): Promise<void> {
    if (await this.subjectsRepository.slugExists(slug, excludeId)) {
      throw new ConflictException(SLUG_CONFLICT_MESSAGE);
    }
  }

  private async assertDisplayOrderAvailable(
    displayOrder: number,
    excludeId?: string,
  ): Promise<void> {
    if (
      await this.subjectsRepository.displayOrderExists(displayOrder, excludeId)
    ) {
      throw new ConflictException(DISPLAY_ORDER_CONFLICT_MESSAGE);
    }
  }
}
