import { Type } from 'class-transformer';
import {
  IsInt,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

/**
 * Query of GET /api/v1/statistics/recent (docs/04-api/statistics.md §8,
 * decision S5): the standard pagination envelope inputs plus the shared
 * locale.
 */
export class RecentActivityQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number = 20;

  @ValidateIf((dto: RecentActivityQueryDto) => dto.locale !== undefined)
  @IsString()
  @MaxLength(20)
  locale?: string;
}
