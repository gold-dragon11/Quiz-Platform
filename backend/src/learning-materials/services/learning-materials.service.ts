import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { SubjectsService } from '../../subjects/services/subjects.service';
import { TopicsService } from '../../topics/services/topics.service';
import { CreateLearningMaterialDto } from '../dto/create-learning-material.dto';
import { ListLearningMaterialsQueryDto } from '../dto/list-learning-materials-query.dto';
import { UpdateLearningMaterialDto } from '../dto/update-learning-material.dto';
import {
  estimateReadingTime,
  findContentViolation,
} from '../learning-material.constants';
import {
  LearningMaterialRecord,
  LearningMaterialsRepository,
} from '../repositories/learning-materials.repository';
import { PaginatedLearningMaterials } from '../types/paginated-learning-materials.type';
import { PublicLearningMaterial } from '../types/public-learning-material.type';
import { PublicLearningMaterialSummary } from '../types/public-learning-material-summary.type';

const MATERIAL_NOT_FOUND_MESSAGE = 'Навчальний матеріал не знайдено.';
const SUBJECT_NOT_FOUND_MESSAGE = 'Предмет не знайдено.';
const TOPIC_NOT_IN_SUBJECT_MESSAGE =
  'Тема не належить до цього предмета, тому матеріал не можна до неї прив’язати.';
const SLUG_CONFLICT_MESSAGE =
  'A learning material with this slug already exists in this subject.';
const DISPLAY_ORDER_CONFLICT_MESSAGE =
  'A learning material with this display order already exists in this subject.';

/**
 * Learning material use cases (docs/04-api/learning-materials.md,
 * docs/02-domain/learning-material.md).
 *
 * Materials are read-only for learners and authored either from the seed
 * content files or through the Admin API. Slug uniqueness is scoped to the
 * parent subject; display order is contested only among visible materials.
 */
@Injectable()
export class LearningMaterialsService {
  constructor(
    private readonly learningMaterialsRepository: LearningMaterialsRepository,
    private readonly subjectsService: SubjectsService,
    private readonly topicsService: TopicsService,
  ) {}

  /**
   * Every published material of one subject (docs/04-api/learning-materials.md
   * §4). An unknown or unpublished subject yields an empty list rather than a
   * 404, for the same reason the per-topic route is always 404: the public API
   * never distinguishes "nothing here" from "hidden".
   */
  async findPublishedForSubject(
    subjectId: string,
  ): Promise<PublicLearningMaterialSummary[]> {
    return this.learningMaterialsRepository.findPublishedForSubject(subjectId);
  }

  /**
   * The published material for one topic (docs/04-api/learning-materials.md
   * §4). A topic with no material, an unpublished material, or an
   * unpublished ancestor are all indistinguishable — every case is 404, so
   * the endpoint reveals nothing about unpublished content.
   */
  async findPublishedForTopic(
    topicId: string,
  ): Promise<PublicLearningMaterial> {
    const material =
      await this.learningMaterialsRepository.findPublishedForTopic(topicId);
    if (!material) {
      throw new NotFoundException(MATERIAL_NOT_FOUND_MESSAGE);
    }
    return material;
  }

  async list(
    query: ListLearningMaterialsQueryDto,
  ): Promise<PaginatedLearningMaterials> {
    const { items, totalItems } =
      await this.learningMaterialsRepository.findPage({
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        subjectId: query.subjectId,
        topicId: query.topicId,
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

  async create(
    dto: CreateLearningMaterialDto,
  ): Promise<LearningMaterialRecord> {
    if (!(await this.subjectsService.subjectExists(dto.subjectId))) {
      throw new NotFoundException(SUBJECT_NOT_FOUND_MESSAGE);
    }
    if (dto.topicId) {
      await this.assertTopicInSubject(dto.topicId, dto.subjectId);
    }
    this.assertContentIsSafe(dto.content);
    await this.assertSlugAvailable(dto.subjectId, dto.slug);

    let displayOrder = dto.displayOrder;
    if (displayOrder === undefined) {
      const max =
        await this.learningMaterialsRepository.maxDisplayOrderInSubject(
          dto.subjectId,
        );
      displayOrder = max === null ? 0 : max + 1;
    } else {
      await this.assertDisplayOrderAvailable(dto.subjectId, displayOrder);
    }

    try {
      return await this.learningMaterialsRepository.create({
        subjectId: dto.subjectId,
        topicId: dto.topicId ?? null,
        title: dto.title,
        slug: dto.slug,
        description: dto.description,
        content: dto.content,
        estimatedReadingTime: estimateReadingTime(dto.content),
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
    dto: UpdateLearningMaterialDto,
  ): Promise<LearningMaterialRecord> {
    const material = await this.learningMaterialsRepository.findActiveById(id);
    if (!material) {
      throw new NotFoundException(MATERIAL_NOT_FOUND_MESSAGE);
    }

    if (dto.topicId) {
      await this.assertTopicInSubject(dto.topicId, material.subjectId);
    }
    if (dto.content !== undefined) {
      this.assertContentIsSafe(dto.content);
    }
    if (dto.slug !== undefined && dto.slug !== material.slug) {
      await this.assertSlugAvailable(material.subjectId, dto.slug, id);
    }
    if (
      dto.displayOrder !== undefined &&
      dto.displayOrder !== material.displayOrder
    ) {
      await this.assertDisplayOrderAvailable(
        material.subjectId,
        dto.displayOrder,
        id,
      );
    }

    // Merge semantics: only supplied fields change; explicit null clears the
    // description and detaches the topic. Reading time is re-derived whenever
    // the body changes, so the two can never disagree.
    const data: Prisma.LearningMaterialUpdateInput = {
      ...(dto.title === undefined ? {} : { title: dto.title }),
      ...(dto.slug === undefined ? {} : { slug: dto.slug }),
      ...(dto.description === undefined
        ? {}
        : { description: dto.description }),
      ...(dto.content === undefined
        ? {}
        : {
            content: dto.content,
            estimatedReadingTime: estimateReadingTime(dto.content),
          }),
      ...(dto.isPublished === undefined
        ? {}
        : { isPublished: dto.isPublished }),
      ...(dto.displayOrder === undefined
        ? {}
        : { displayOrder: dto.displayOrder }),
      ...(dto.topicId === undefined
        ? {}
        : dto.topicId === null
          ? { topic: { disconnect: true } }
          : { topic: { connect: { id: dto.topicId } } }),
    };

    return this.learningMaterialsRepository.update(id, data);
  }

  async remove(id: string): Promise<void> {
    const deleted =
      await this.learningMaterialsRepository.softDeleteIfActive(id);
    if (!deleted) {
      throw new NotFoundException(MATERIAL_NOT_FOUND_MESSAGE);
    }
  }

  private assertContentIsSafe(content: string): void {
    const violation = findContentViolation(content);
    if (violation) {
      throw new BadRequestException(violation);
    }
  }

  private async assertTopicInSubject(
    topicId: string,
    subjectId: string,
  ): Promise<void> {
    if (!(await this.topicsService.topicBelongsToSubject(topicId, subjectId))) {
      throw new BadRequestException(TOPIC_NOT_IN_SUBJECT_MESSAGE);
    }
  }

  private async assertSlugAvailable(
    subjectId: string,
    slug: string,
    excludeId?: string,
  ): Promise<void> {
    if (
      await this.learningMaterialsRepository.slugExistsInSubject(
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
      await this.learningMaterialsRepository.displayOrderExistsInSubject(
        subjectId,
        displayOrder,
        excludeId,
      )
    ) {
      throw new ConflictException(DISPLAY_ORDER_CONFLICT_MESSAGE);
    }
  }
}
