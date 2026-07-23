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

export const TOPIC_SORT_FIELDS = ['displayOrder', 'name', 'createdAt'] as const;
export type TopicSortField = (typeof TOPIC_SORT_FIELDS)[number];

/**
 * Query string of GET /api/v1/admin/topics (docs/04-api/admin.md §5, §12-13).
 *
 * Administrators see published and unpublished topics; soft-deleted topics
 * are never returned.
 */
export class ListTopicsQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number = 20;

  @ValidateIf((dto: ListTopicsQueryDto) => dto.subjectId !== undefined)
  @IsUUID()
  subjectId?: string;

  /** Query parameters arrive as strings; accept only literal true/false. */
  @ValidateIf((dto: ListTopicsQueryDto) => dto.isPublished !== undefined)
  @Transform(({ value }) =>
    value === 'true' ? true : value === 'false' ? false : (value as unknown),
  )
  @IsBoolean()
  isPublished?: boolean;

  /** Case-insensitive match against name and slug. */
  @ValidateIf((dto: ListTopicsQueryDto) => dto.search !== undefined)
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsIn(TOPIC_SORT_FIELDS)
  sortBy: TopicSortField = 'displayOrder';

  @IsIn(SORT_ORDERS)
  sortOrder: SortOrder = 'asc';
}
