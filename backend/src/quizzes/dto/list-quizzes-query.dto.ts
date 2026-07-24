import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
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

export const QUIZ_SORT_FIELDS = ['createdAt', 'title'] as const;
export type QuizSortField = (typeof QUIZ_SORT_FIELDS)[number];

/**
 * Query string of GET /api/v1/admin/quizzes (docs/04-api/admin.md §8).
 * Newest first by default. Administrators see published and unpublished
 * configurations; soft-deleted ones are never returned.
 */
export class ListQuizzesQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number = 20;

  @ValidateIf((dto: ListQuizzesQueryDto) => dto.subjectId !== undefined)
  @IsUUID()
  subjectId?: string;

  @ValidateIf((dto: ListQuizzesQueryDto) => dto.topicId !== undefined)
  @IsUUID()
  topicId?: string;

  /** Query parameters arrive as strings; accept only literal true/false. */
  @ValidateIf((dto: ListQuizzesQueryDto) => dto.isPublished !== undefined)
  @Transform(({ value }) =>
    value === 'true' ? true : value === 'false' ? false : (value as unknown),
  )
  @IsBoolean()
  isPublished?: boolean;

  /** Case-insensitive match against the title. */
  @ValidateIf((dto: ListQuizzesQueryDto) => dto.search !== undefined)
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsIn(QUIZ_SORT_FIELDS)
  sortBy: QuizSortField = 'createdAt';

  @IsIn(SORT_ORDERS)
  sortOrder: SortOrder = 'desc';
}
