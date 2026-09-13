import { BadRequestException, Injectable } from '@nestjs/common';
import { Difficulty } from '@prisma/client';
import { randomInt } from 'node:crypto';
import {
  CreateAssignmentDto,
  MAX_QUESTIONS_PER_ASSIGNMENT,
  QuestionSelectionMode,
} from '../dto/create-assignment.dto';
import { AssignmentsRepository } from '../repositories/assignments.repository';
import { ReviewService } from './review.service';

const TOPIC_NOT_IN_SUBJECT_MESSAGE =
  'Тема не належить предмету цієї групи або не опублікована.';
const UNUSABLE_QUESTIONS_MESSAGE =
  'Деякі запитання не існують, не опубліковані або належать іншому предмету.';
const NO_QUESTIONS_MESSAGE = 'Потрібно вибрати хоча б одне запитання.';
const NO_MISTAKES_YET_MESSAGE =
  'Група ще не має результатів, щоб визначити слабкі теми. Спершу видайте звичайне завдання.';
const TOO_MANY_MESSAGE = `Максимум ${MAX_QUESTIONS_PER_ASSIGNMENT} запитань на одне завдання.`;

/** How many of the group's weakest topics the MISTAKES pool spans. */
const WEAK_TOPICS_DRAWN_FROM = 3;

/** Assembles the question list for a new assignment (decision 09). */
@Injectable()
export class QuestionSelectionService {
  constructor(
    private readonly assignmentsRepository: AssignmentsRepository,
    private readonly reviewService: ReviewService,
  ) {}

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
    groupId: string,
  ): Promise<string[]> {
    const questionIds = await this.resolveByMode(dto, subjectId, groupId);

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
    groupId: string,
  ): Promise<string[]> {
    switch (dto.mode) {
      case QuestionSelectionMode.MANUAL:
        return this.resolveManual(dto.questionIds ?? [], subjectId);
      case QuestionSelectionMode.TOPIC:
        return this.resolveByTopic(dto, subjectId);
      case QuestionSelectionMode.DIFFICULTY:
        return this.resolveByDifficulty(dto, subjectId);
      case QuestionSelectionMode.MISTAKES:
        return this.resolveByMistakes(dto, subjectId, groupId);
      case QuestionSelectionMode.MOCK_EXAM:
        // Drawn by the quiz engine from the paper, never from here — see
        // AssignmentsService.create. Reaching this is a wiring mistake, and
        // an empty list refuses it rather than inventing a paper.
        return [];
    }
  }

  /**
   * Draws from the topics this group is weakest in.
   *
   * Topics rather than the exact questions they got wrong: repeating the same
   * items tests memory of those items, while a fresh draw from the same topic
   * tests whether the topic itself has landed.
   *
   * Filled worst-topic-first rather than sampled from one merged pool. Merging
   * looked simpler and was wrong: with two topics of four questions each, a
   * draw of three could miss the weak topic entirely about one time in
   * fourteen, and the teacher would get "work on your mistakes" made entirely
   * of the material the class already knows. Taking as much as possible from
   * the weakest topic before moving on is the honest reading of the request.
   *
   * Refuses rather than falling back to a random draw when the group has no
   * results yet — a teacher who asked for "their weak spots" and quietly got
   * an arbitrary set would trust the feature exactly once.
   */
  private async resolveByMistakes(
    dto: CreateAssignmentDto,
    subjectId: string,
    groupId: string,
  ): Promise<string[]> {
    const count = dto.count as number;
    const topicIds = await this.reviewService.weakestTopicIds(
      groupId,
      WEAK_TOPICS_DRAWN_FROM,
    );
    if (topicIds.length === 0) {
      throw new BadRequestException(NO_MISTAKES_YET_MESSAGE);
    }

    const picked: string[] = [];
    for (const topicId of topicIds) {
      if (picked.length >= count) {
        break;
      }
      const available =
        await this.assignmentsRepository.findSelectableQuestions({
          subjectId,
          topicId,
        });
      const take = Math.min(count - picked.length, available.length);
      picked.push(
        ...this.sample(
          available.map((row) => row.id),
          take,
          take,
        ),
      );
    }

    if (picked.length < count) {
      throw new BadRequestException(
        `Замало запитань у слабких темах: потрібно ${count}, доступно ${picked.length}.`,
      );
    }
    return picked;
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
