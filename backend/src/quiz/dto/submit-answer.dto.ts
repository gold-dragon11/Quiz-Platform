import { Type } from 'class-transformer';
import {
  IsInt,
  IsObject,
  IsOptional,
  IsUUID,
  Min,
  ValidateIf,
} from 'class-validator';

/**
 * Body of POST /api/v1/quiz/{sessionId}/answers (docs/04-api/quiz.md §6).
 *
 * `selectedAnswer` is polymorphic by question type and validated against the
 * question in the service (decision D9):
 * - SINGLE_CHOICE: `{ "answerOptionId": "uuid" }`
 * - MATCHING: `{ "pairs": [ { "left": "uuid", "right": "uuid" } ] }`
 *
 * `timeSpentSeconds` is client-supplied, analytics-only, and never affects
 * scoring or XP (docs/02-domain/question-attempt.md §9).
 */
export class SubmitAnswerDto {
  @IsUUID()
  questionId!: string;

  @IsObject()
  selectedAnswer!: Record<string, unknown>;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @ValidateIf((dto: SubmitAnswerDto) => dto.timeSpentSeconds !== undefined)
  timeSpentSeconds?: number;
}
