import { Difficulty, QuestionType } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import type { SortOrder } from '../../subjects/dto/list-subjects-query.dto';
import { SORT_ORDERS } from '../../subjects/dto/list-subjects-query.dto';

export const QUESTION_SORT_FIELDS = ['createdAt', 'title'] as const;
export type QuestionSortField = (typeof QUESTION_SORT_FIELDS)[number];

/**
 * Query string of GET /api/v1/admin/questions (docs/04-api/admin.md §6,
 * §12-13). Newest first by default — questions have no display order.
 *
 * Administrators see published and unpublished questions; soft-deleted
 * questions are never returned.
 */
export class ListQuestionsQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number = 20;

  @ValidateIf((dto: ListQuestionsQueryDto) => dto.topicId !== undefined)
  @IsUUID()
  topicId?: string;

  /** Filters through the topic relation — questions have no direct subject. */
  @ValidateIf((dto: ListQuestionsQueryDto) => dto.subjectId !== undefined)
  @IsUUID()
  subjectId?: string;

  @ValidateIf((dto: ListQuestionsQueryDto) => dto.type !== undefined)
  @IsEnum(QuestionType)
  type?: QuestionType;

  @ValidateIf((dto: ListQuestionsQueryDto) => dto.difficulty !== undefined)
  @IsEnum(Difficulty)
  difficulty?: Difficulty;

  /** Query parameters arrive as strings; accept only literal true/false. */
  @ValidateIf((dto: ListQuestionsQueryDto) => dto.isPublished !== undefined)
  @Transform(({ value }) =>
    value === 'true' ? true : value === 'false' ? false : (value as unknown),
  )
  @IsBoolean()
  isPublished?: boolean;

  /** Case-insensitive match against the title. */
  @ValidateIf((dto: ListQuestionsQueryDto) => dto.search !== undefined)
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsIn(QUESTION_SORT_FIELDS)
  sortBy: QuestionSortField = 'createdAt';

  @IsIn(SORT_ORDERS)
  sortOrder: SortOrder = 'desc';
}
