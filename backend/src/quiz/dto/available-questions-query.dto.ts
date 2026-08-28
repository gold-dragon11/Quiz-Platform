import { Difficulty } from '@prisma/client';
import { IsEnum, IsUUID, ValidateIf } from 'class-validator';

/**
 * Query of GET /api/v1/quiz/available (docs/04-api/quiz.md §4a) — the same
 * pool filters `POST /quiz/start` accepts for an ad-hoc quiz, so the count it
 * returns is exactly what that request would draw from.
 */
export class AvailableQuestionsQueryDto {
  @IsUUID()
  subjectId!: string;

  @ValidateIf((dto: AvailableQuestionsQueryDto) => dto.topicId !== undefined)
  @IsUUID()
  topicId?: string;

  @ValidateIf((dto: AvailableQuestionsQueryDto) => dto.difficulty !== undefined)
  @IsEnum(Difficulty)
  difficulty?: Difficulty;
}
