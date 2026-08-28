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

export const LEARNING_MATERIAL_SORT_FIELDS = [
  'displayOrder',
  'title',
  'createdAt',
] as const;
export type LearningMaterialSortField =
  (typeof LEARNING_MATERIAL_SORT_FIELDS)[number];

/**
 * Query string of GET /api/v1/admin/learning-materials
 * (docs/04-api/admin.md §12-13).
 *
 * Administrators see published and unpublished materials; soft-deleted ones
 * are never returned.
 */
export class ListLearningMaterialsQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number = 20;

  @ValidateIf(
    (dto: ListLearningMaterialsQueryDto) => dto.subjectId !== undefined,
  )
  @IsUUID()
  subjectId?: string;

  @ValidateIf((dto: ListLearningMaterialsQueryDto) => dto.topicId !== undefined)
  @IsUUID()
  topicId?: string;

  /** Query parameters arrive as strings; accept only literal true/false. */
  @ValidateIf(
    (dto: ListLearningMaterialsQueryDto) => dto.isPublished !== undefined,
  )
  @Transform(({ value }) =>
    value === 'true' ? true : value === 'false' ? false : (value as unknown),
  )
  @IsBoolean()
  isPublished?: boolean;

  /** Case-insensitive match against title and slug. */
  @ValidateIf((dto: ListLearningMaterialsQueryDto) => dto.search !== undefined)
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsIn(LEARNING_MATERIAL_SORT_FIELDS)
  sortBy: LearningMaterialSortField = 'displayOrder';

  @IsIn(SORT_ORDERS)
  sortOrder: SortOrder = 'asc';
}
