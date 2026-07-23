import { Difficulty, Language } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsString,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { AnswerOptionInputDto } from './answer-option-input.dto';

/**
 * Body of PUT /api/v1/admin/questions/{id} (docs/04-api/admin.md §6).
 *
 * Merge semantics: only supplied fields change; explicit `null` clears the
 * nullable imageUrl and difficulty. `type` is immutable and `isPublished`
 * changes only through the publish endpoint — both are rejected by the
 * whitelist pipe, as is `explanation`.
 *
 * When `options` is supplied it is the complete desired option set,
 * merged by id: entries with an id update that option, entries without an id
 * create one, and persisted options missing from the array are deleted.
 *
 * When `locale` is present the request targets translations instead: only
 * `title` and `options` entries of the form `{id, content}` are allowed
 * (docs/02-domain/question.md §11, docs/02-domain/answer-option.md §12).
 */
export class UpdateQuestionDto {
  @ValidateIf((dto: UpdateQuestionDto) => dto.locale !== undefined)
  @IsEnum(Language)
  locale?: Language;

  @ValidateIf((dto: UpdateQuestionDto) => dto.title !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  title?: string;

  @ValidateIf(
    (dto: UpdateQuestionDto) =>
      dto.imageUrl !== undefined && dto.imageUrl !== null,
  )
  @IsString()
  @MaxLength(500)
  imageUrl?: string | null;

  @ValidateIf(
    (dto: UpdateQuestionDto) =>
      dto.difficulty !== undefined && dto.difficulty !== null,
  )
  @IsEnum(Difficulty)
  difficulty?: Difficulty | null;

  @ValidateIf((dto: UpdateQuestionDto) => dto.options !== undefined)
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => AnswerOptionInputDto)
  options?: AnswerOptionInputDto[];

  @ValidateIf((dto: UpdateQuestionDto) => dto.configuration !== undefined)
  @IsObject()
  configuration?: Record<string, unknown>;
}
