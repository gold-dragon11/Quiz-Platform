import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { SubjectsService } from '../../subjects/services/subjects.service';
import { TopicsService } from '../../topics/services/topics.service';
import { CreateQuizDto } from '../dto/create-quiz.dto';
import { ListQuizzesQueryDto } from '../dto/list-quizzes-query.dto';
import { UpdateQuizDto } from '../dto/update-quiz.dto';
import {
  QuizConfigRepository,
  QuizRecord,
} from '../repositories/quiz-config.repository';
import { PaginatedQuizzes } from '../types/paginated-quizzes.type';

const QUIZ_NOT_FOUND_MESSAGE = 'Тест не знайдено.';
const SUBJECT_NOT_FOUND_MESSAGE = 'Предмет не знайдено.';
const TOPIC_NOT_FOUND_MESSAGE = 'Тему не знайдено.';

/**
 * Administrative quiz-configuration use cases (docs/04-api/admin.md §8,
 * docs/02-domain/quiz.md). This is the reusable-template CRUD only — it never
 * generates sessions, questions, results, or XP; those belong to the separate
 * Quiz engine and are untouched.
 *
 * Parent validation uses the Subjects and Topics public service interfaces:
 * the subject and any topic must exist and not be soft-deleted (decision
 * Q10). Publication of the parent is not required. The administrator-selected
 * mode is persisted verbatim (decision Q7).
 */
@Injectable()
export class QuizConfigService {
  constructor(
    private readonly quizConfigRepository: QuizConfigRepository,
    private readonly subjectsService: SubjectsService,
    private readonly topicsService: TopicsService,
  ) {}

  async list(query: ListQuizzesQueryDto): Promise<PaginatedQuizzes> {
    const { items, totalItems } = await this.quizConfigRepository.findPage({
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

  /**
   * A published, non-deleted quiz configuration by id, or null. Public
   * interface for the Quiz engine's stored-Quiz start path
   * (docs/04-api/quiz.md §4, Phase 5.6 decision B7) — an unknown, unpublished,
   * or soft-deleted quiz is indistinguishably null so the caller answers 404
   * without revealing which condition failed (decision B2).
   */
  async findPublishedById(id: string): Promise<QuizRecord | null> {
    const quiz = await this.quizConfigRepository.findActiveById(id);
    return quiz && quiz.isPublished ? quiz : null;
  }

  async create(dto: CreateQuizDto): Promise<QuizRecord> {
    if (!(await this.subjectsService.subjectExists(dto.subjectId))) {
      throw new NotFoundException(SUBJECT_NOT_FOUND_MESSAGE);
    }
    if (dto.topicId !== undefined) {
      await this.assertTopicExists(dto.topicId);
    }

    return this.quizConfigRepository.create({
      subjectId: dto.subjectId,
      topicId: dto.topicId ?? null,
      title: dto.title,
      description: dto.description,
      mode: dto.mode,
      questionCount: dto.questionCount,
      // Documented defaults (decisions Q5/Q6).
      timerEnabled: dto.timerEnabled ?? false,
      isPublished: dto.isPublished ?? false,
    });
  }

  /**
   * Merge-updates a quiz configuration (docs/04-api/admin.md §8, decision Q6).
   * `subjectId` is immutable (absent from the DTO); `topicId` may change,
   * including to `null` to detach the topic; an explicit `null` clears the
   * description.
   */
  async update(id: string, dto: UpdateQuizDto): Promise<QuizRecord> {
    const quiz = await this.quizConfigRepository.findActiveById(id);
    if (!quiz) {
      throw new NotFoundException(QUIZ_NOT_FOUND_MESSAGE);
    }

    if (
      dto.topicId !== undefined &&
      dto.topicId !== null &&
      dto.topicId !== quiz.topicId
    ) {
      await this.assertTopicExists(dto.topicId);
    }

    const data: Prisma.QuizUpdateInput = {
      ...(dto.title === undefined ? {} : { title: dto.title }),
      ...(dto.description === undefined
        ? {}
        : { description: dto.description }),
      ...(dto.mode === undefined ? {} : { mode: dto.mode }),
      ...(dto.questionCount === undefined
        ? {}
        : { questionCount: dto.questionCount }),
      ...(dto.timerEnabled === undefined
        ? {}
        : { timerEnabled: dto.timerEnabled }),
      ...(dto.isPublished === undefined
        ? {}
        : { isPublished: dto.isPublished }),
      ...(dto.topicId === undefined
        ? {}
        : dto.topicId === null
          ? { topic: { disconnect: true } }
          : { topic: { connect: { id: dto.topicId } } }),
    };

    return this.quizConfigRepository.update(id, data);
  }

  async remove(id: string): Promise<void> {
    const deleted = await this.quizConfigRepository.softDeleteIfActive(id);
    if (!deleted) {
      throw new NotFoundException(QUIZ_NOT_FOUND_MESSAGE);
    }
  }

  /**
   * The topic must exist and not be soft-deleted (decision Q10), checked
   * through the Topics module's public interface — no cross-module Prisma.
   */
  private async assertTopicExists(topicId: string): Promise<void> {
    if (!(await this.topicsService.topicExists(topicId))) {
      throw new NotFoundException(TOPIC_NOT_FOUND_MESSAGE);
    }
  }
}
