import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

export const SUBJECT_SORT_FIELDS = [
  'displayOrder',
  'name',
  'createdAt',
] as const;
export type SubjectSortField = (typeof SUBJECT_SORT_FIELDS)[number];

export const SORT_ORDERS = ['asc', 'desc'] as const;
export type SortOrder = (typeof SORT_ORDERS)[number];

/**
 * Query string of GET /api/v1/admin/subjects (docs/04-api/admin.md §4, §12-13).
 *
 * Administrators see published and unpublished subjects; soft-deleted
 * subjects are never returned.
 */
export class ListSubjectsQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number = 20;

  /** Query parameters arrive as strings; accept only literal true/false. */
  @ValidateIf((dto: ListSubjectsQueryDto) => dto.isPublished !== undefined)
  @Transform(({ value }) =>
    value === 'true' ? true : value === 'false' ? false : (value as unknown),
  )
  @IsBoolean()
  isPublished?: boolean;

  /** Case-insensitive match against name and slug. */
  @ValidateIf((dto: ListSubjectsQueryDto) => dto.search !== undefined)
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsIn(SUBJECT_SORT_FIELDS)
  sortBy: SubjectSortField = 'displayOrder';

  @IsIn(SORT_ORDERS)
  sortOrder: SortOrder = 'asc';
}
