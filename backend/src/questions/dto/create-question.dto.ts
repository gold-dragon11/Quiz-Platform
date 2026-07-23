import { Difficulty, QuestionType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { AnswerOptionInputDto } from './answer-option-input.dto';

/**
 * Body of POST /api/v1/admin/questions (docs/04-api/admin.md §6).
 *
 * Creates the default-locale (English) record only — `locale` is not
 * accepted here. `isPublished` is not accepted either: new questions always
 * start unpublished and are published through the dedicated publish endpoint.
 * `explanation` is not part of the MVP contract and is rejected by the
 * whitelist pipe.
 *
 * `configuration` carries the MATCHING correct pairs
 * (docs/02-domain/answer-option.md §9) and is forbidden for SINGLE_CHOICE;
 * the service validates its structure against the option set.
 */
export class CreateQuestionDto {
  @IsUUID()
  topicId!: string;

  @IsEnum(QuestionType)
  type!: QuestionType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  title!: string;

  @ValidateIf((dto: CreateQuestionDto) => dto.imageUrl !== undefined)
  @IsString()
  @MaxLength(500)
  imageUrl?: string;

  @ValidateIf((dto: CreateQuestionDto) => dto.difficulty !== undefined)
  @IsEnum(Difficulty)
  difficulty?: Difficulty;

  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => AnswerOptionInputDto)
  options!: AnswerOptionInputDto[];

  @ValidateIf((dto: CreateQuestionDto) => dto.configuration !== undefined)
  @IsObject()
  configuration?: Record<string, unknown>;
}
