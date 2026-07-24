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
import { MAX_QUESTION_COUNT, MIN_QUESTION_COUNT } from './create-quiz.dto';

/**
 * Body of PUT /api/v1/admin/quizzes/{id} (docs/04-api/admin.md §8).
 *
 * Merge semantics (decision Q6): only supplied fields change. `subjectId` is
 * immutable and therefore not accepted here; `topicId` may change (including
 * to `null` to detach the topic); an explicit `null` clears `description`.
 */
export class UpdateQuizDto {
  @ValidateIf(
    (dto: UpdateQuizDto) => dto.topicId !== undefined && dto.topicId !== null,
  )
  @IsUUID()
  topicId?: string | null;

  @ValidateIf((dto: UpdateQuizDto) => dto.title !== undefined)
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  title?: string;

  @ValidateIf(
    (dto: UpdateQuizDto) =>
      dto.description !== undefined && dto.description !== null,
  )
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  description?: string | null;

  @ValidateIf((dto: UpdateQuizDto) => dto.mode !== undefined)
  @IsEnum(QuizType)
  mode?: QuizType;

  @ValidateIf((dto: UpdateQuizDto) => dto.questionCount !== undefined)
  @IsInt()
  @Min(MIN_QUESTION_COUNT)
  @Max(MAX_QUESTION_COUNT)
  questionCount?: number;

  @ValidateIf((dto: UpdateQuizDto) => dto.timerEnabled !== undefined)
  @IsBoolean()
  timerEnabled?: boolean;

  @ValidateIf((dto: UpdateQuizDto) => dto.isPublished !== undefined)
  @IsBoolean()
  isPublished?: boolean;
}
