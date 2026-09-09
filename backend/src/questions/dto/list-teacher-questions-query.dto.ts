import { Difficulty, QuestionFormat, QuestionType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

/**
 * Query string of GET /api/v1/teacher/questions.
 *
 * The administrator's version of this query carries `isPublished`, `sortBy`
 * and `sortOrder`. None of them is here, and the omissions are the point: a
 * teacher reads the bank to prepare a lesson, not to manage it. Unpublished
 * questions are the administrator's working drafts and are never a teacher's
 * to see, so publication is not a filter they may set — it is fixed.
 */
export class ListTeacherQuestionsQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number = 20;

  @ValidateIf((dto: ListTeacherQuestionsQueryDto) => dto.topicId !== undefined)
  @IsUUID()
  topicId?: string;

  /** Filters through the topic relation — questions have no direct subject. */
  @ValidateIf(
    (dto: ListTeacherQuestionsQueryDto) => dto.subjectId !== undefined,
  )
  @IsUUID()
  subjectId?: string;

  @ValidateIf((dto: ListTeacherQuestionsQueryDto) => dto.type !== undefined)
  @IsEnum(QuestionType)
  type?: QuestionType;

  /** Lets a teacher pull only the reference NMT questions for a lesson. */
  @ValidateIf((dto: ListTeacherQuestionsQueryDto) => dto.format !== undefined)
  @IsEnum(QuestionFormat)
  format?: QuestionFormat;

  @ValidateIf(
    (dto: ListTeacherQuestionsQueryDto) => dto.difficulty !== undefined,
  )
  @IsEnum(Difficulty)
  difficulty?: Difficulty;

  /** Case-insensitive match against the question title. */
  @ValidateIf((dto: ListTeacherQuestionsQueryDto) => dto.search !== undefined)
  @IsString()
  @MaxLength(200)
  search?: string;
}
