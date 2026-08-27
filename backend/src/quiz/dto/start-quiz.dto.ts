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
 * Two mutually exclusive generation modes (Phase 5.6 decision B1 — XOR):
 * - **stored Quiz**: supply only `quizId`; all configuration is loaded from
 *   the published Quiz and the ad-hoc fields must not be present;
 * - **ad hoc**: supply `subjectId`, `questionCount`, and `timerEnabled`
 *   (optional `topicId`); no `quizId`. The mode is derived from `topicId`
 *   (present → SUBJECT_QUIZ, absent → RANDOM_QUIZ, decision D2).
 *
 * Every field is format-validated only when present; required-ness and the
 * XOR rule are enforced in the service so the two paths give precise errors.
 */
export class StartQuizDto {
  @ValidateIf((dto: StartQuizDto) => dto.quizId !== undefined)
  @IsUUID()
  quizId?: string;

  @ValidateIf((dto: StartQuizDto) => dto.subjectId !== undefined)
  @IsUUID()
  subjectId?: string;

  @ValidateIf((dto: StartQuizDto) => dto.topicId !== undefined)
  @IsUUID()
  topicId?: string;

  @ValidateIf((dto: StartQuizDto) => dto.questionCount !== undefined)
  @Type(() => Number)
  @IsInt()
  @Min(MIN_QUESTION_COUNT)
  @Max(MAX_QUESTION_COUNT)
  questionCount?: number;

  @ValidateIf((dto: StartQuizDto) => dto.timerEnabled !== undefined)
  @IsBoolean()
  timerEnabled?: boolean;

  /**
   * Draw only from questions the reader most recently answered wrong
   * (docs/04-api/quiz.md §4). Narrows the ad-hoc question pool; everything
   * else about the session — mode, timer, scoring, XP — is unchanged. Not
   * combinable with `quizId`, whose question pool comes from the stored Quiz.
   */
  @ValidateIf((dto: StartQuizDto) => dto.onlyMistakes !== undefined)
  @IsBoolean()
  onlyMistakes?: boolean;
}
