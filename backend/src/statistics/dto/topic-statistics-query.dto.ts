import { IsString, IsUUID, MaxLength, ValidateIf } from 'class-validator';

/**
 * Query of GET /api/v1/statistics/topics (docs/04-api/statistics.md §6,
 * decision S4): the shared locale plus an optional subject filter.
 */
export class TopicStatisticsQueryDto {
  @ValidateIf((dto: TopicStatisticsQueryDto) => dto.locale !== undefined)
  @IsString()
  @MaxLength(20)
  locale?: string;

  @ValidateIf((dto: TopicStatisticsQueryDto) => dto.subjectId !== undefined)
  @IsUUID()
  subjectId?: string;
}
