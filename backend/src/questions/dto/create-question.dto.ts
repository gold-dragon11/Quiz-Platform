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
 *
 * `explanation` is the teaching note shown after a quiz is completed
 * (docs/04-api/quiz.md §8) — never while the session is active, since it
 * would give the answer away. It is optional: a question without one simply
 * shows no explanation in the review.
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

  @ValidateIf((dto: CreateQuestionDto) => dto.explanation !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  explanation?: string;

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
