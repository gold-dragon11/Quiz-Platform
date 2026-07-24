import { QuizType } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { trim } from '../../common/transformers/normalize.transformer';

/** Bounds for a quiz configuration (decision Q3). */
export const MIN_QUESTION_COUNT = 1;
export const MAX_QUESTION_COUNT = 50;

/**
 * Body of POST /api/v1/admin/quizzes (docs/04-api/admin.md §8).
 *
 * Creates a reusable quiz configuration. The administrator-selected `mode` is
 * persisted verbatim — it is never derived from `topicId` (decision Q7).
 * `timerEnabled` defaults to false and `isPublished` to false when omitted
 * (decisions Q5/Q6).
 */
export class CreateQuizDto {
  @IsUUID()
  subjectId!: string;

  @ValidateIf((dto: CreateQuizDto) => dto.topicId !== undefined)
  @IsUUID()
  topicId?: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  title!: string;

  @ValidateIf((dto: CreateQuizDto) => dto.description !== undefined)
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsEnum(QuizType)
  mode!: QuizType;

  @IsInt()
  @Min(MIN_QUESTION_COUNT)
  @Max(MAX_QUESTION_COUNT)
  questionCount!: number;

  @ValidateIf((dto: CreateQuizDto) => dto.timerEnabled !== undefined)
  @IsBoolean()
  timerEnabled?: boolean;

  @ValidateIf((dto: CreateQuizDto) => dto.isPublished !== undefined)
  @IsBoolean()
  isPublished?: boolean;
}
