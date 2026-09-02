import { BadRequestException, Injectable } from '@nestjs/common';
import { Difficulty } from '@prisma/client';
import { randomInt } from 'node:crypto';
import {
  CreateAssignmentDto,
  MAX_QUESTIONS_PER_ASSIGNMENT,
  QuestionSelectionMode,
} from '../dto/create-assignment.dto';
import { AssignmentsRepository } from '../repositories/assignments.repository';

const TOPIC_NOT_IN_SUBJECT_MESSAGE =
  'Тема не належить предмету цієї групи або не опублікована.';
const UNUSABLE_QUESTIONS_MESSAGE =
  'Деякі запитання не існують, не опубліковані або належать іншому предмету.';
const NO_QUESTIONS_MESSAGE = 'Потрібно вибрати хоча б одне запитання.';
const TOO_MANY_MESSAGE = `Максимум ${MAX_QUESTIONS_PER_ASSIGNMENT} запитань на одне завдання.`;

/** Assembles the question list for a new assignment (decision 09). */
@Injectable()
export class QuestionSelectionService {
  constructor(private readonly assignmentsRepository: AssignmentsRepository) {}

  /**
   * Resolves the DTO into a concrete, ordered list of question ids.
   *
   * Every path validates against the group's subject. A teacher of mathematics
   * must not be able to post history questions into a mathematics group by
   * sending ids directly — the group's subject is the boundary, and it is
   * checked here rather than trusted from the request.
   */
  async resolve(
    dto: CreateAssignmentDto,
    subjectId: string,
  ): Promise<string[]> {
    const questionIds = await this.resolveByMode(dto, subjectId);

    if (questionIds.length === 0) {
      throw new BadRequestException(NO_QUESTIONS_MESSAGE);
    }
    if (questionIds.length > MAX_QUESTIONS_PER_ASSIGNMENT) {
      throw new BadRequestException(TOO_MANY_MESSAGE);
    }
    return questionIds;
  }

  private async resolveByMode(
    dto: CreateAssignmentDto,
    subjectId: string,
  ): Promise<string[]> {
    switch (dto.mode) {
      case QuestionSelectionMode.MANUAL:
        return this.resolveManual(dto.questionIds ?? [], subjectId);
      case QuestionSelectionMode.TOPIC:
        return this.resolveByTopic(dto, subjectId);
      case QuestionSelectionMode.DIFFICULTY:
        return this.resolveByDifficulty(dto, subjectId);
    }
  }

  /**
   * The teacher picked specific questions. Order is preserved exactly as sent:
   * a teacher who arranged a paper deliberately should get that paper.
   */
  private async resolveManual(
    questionIds: string[],
    subjectId: string,
  ): Promise<string[]> {
    const usable = await this.assignmentsRepository.findUsableQuestionIds(
      questionIds,
      subjectId,
    );

    const rejected = questionIds.filter((id) => !usable.has(id));
    if (rejected.length > 0) {
      throw new BadRequestException(UNUSABLE_QUESTIONS_MESSAGE);
    }
    return questionIds;
  }

  private async resolveByTopic(
    dto: CreateAssignmentDto,
    subjectId: string,
  ): Promise<string[]> {
    const topicId = dto.topicId as string;
    const count = dto.count as number;

    await this.requireTopicInSubject(topicId, subjectId);
    const available = await this.assignmentsRepository.findSelectableQuestions({
      subjectId,
      topicId,
    });

    return this.sample(
      available.map((row) => row.id),
      count,
      count,
    );
  }

  private async resolveByDifficulty(
    dto: CreateAssignmentDto,
    subjectId: string,
  ): Promise<string[]> {
    if (dto.topicId) {
      await this.requireTopicInSubject(dto.topicId, subjectId);
    }

    const wanted: [Difficulty, number][] = [
      [Difficulty.BEGINNER, dto.beginner ?? 0],
      [Difficulty.INTERMEDIATE, dto.intermediate ?? 0],
      [Difficulty.ADVANCED, dto.advanced ?? 0],
    ];

    const picked: string[] = [];
    for (const [difficulty, count] of wanted) {
      if (count === 0) {
        continue;
      }
      const available =
        await this.assignmentsRepository.findSelectableQuestions({
          subjectId,
          topicId: dto.topicId,
          difficulty,
        });
      picked.push(
        ...this.sample(
          available.map((row) => row.id),
          count,
          count,
        ),
      );
    }
    return picked;
  }

  private async requireTopicInSubject(
    topicId: string,
    subjectId: string,
  ): Promise<void> {
    const belongs = await this.assignmentsRepository.topicBelongsToSubject(
      topicId,
      subjectId,
    );
    if (!belongs) {
      throw new BadRequestException(TOPIC_NOT_IN_SUBJECT_MESSAGE);
    }
  }

  /**
   * Draws `count` ids without replacement.
   *
   * Fails loudly when the pool is too small rather than quietly issuing a
   * shorter assignment: a teacher who asked for twenty questions and silently
   * received eleven finds out in front of the class.
   *
   * The shuffle is a partial Fisher–Yates over a copy, seeded from
   * `node:crypto` — the same reasoning as invite codes, and it costs nothing.
   */
  private sample(pool: string[], count: number, requested: number): string[] {
    if (pool.length < count) {
      throw new BadRequestException(
        `Замало запитань: потрібно ${requested}, доступно ${pool.length}.`,
      );
    }

    const copy = [...pool];
    for (let index = 0; index < count; index += 1) {
      const swap = index + randomInt(copy.length - index);
      [copy[index], copy[swap]] = [copy[swap], copy[index]];
    }
    return copy.slice(0, count);
  }
}
