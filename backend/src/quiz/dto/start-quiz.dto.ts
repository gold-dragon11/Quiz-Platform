import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsUUID,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';

/** Bounds for an ad-hoc quiz (decision D22). */
export const MIN_QUESTION_COUNT = 1;
export const MAX_QUESTION_COUNT = 50;

/**
 * Body of POST /api/v1/quiz/start (docs/04-api/quiz.md §4).
 *
 * Ad-hoc generation only in this phase — `quizId` templates are deferred
 * (decision D26). The mode is derived from `topicId`: present → SUBJECT_QUIZ,
 * absent → RANDOM_QUIZ (decision D2).
 */
export class StartQuizDto {
  @IsUUID()
  subjectId!: string;

  @ValidateIf((dto: StartQuizDto) => dto.topicId !== undefined)
  @IsUUID()
  topicId?: string;

  @Type(() => Number)
  @IsInt()
  @Min(MIN_QUESTION_COUNT)
  @Max(MAX_QUESTION_COUNT)
  questionCount!: number;

  @IsBoolean()
  timerEnabled!: boolean;
}
