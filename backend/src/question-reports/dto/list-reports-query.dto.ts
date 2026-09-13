import { Type } from 'class-transformer';
import { QuestionReportStatus } from '@prisma/client';
import { IsEnum, IsInt, Max, Min, ValidateIf } from 'class-validator';

/** Query for GET /api/v1/admin/question-reports. */
export class ListReportsQueryDto {
  /** Defaults to the open queue, which is what a reviewer opens the page for. */
  @ValidateIf((dto: ListReportsQueryDto) => dto.status !== undefined)
  @IsEnum(QuestionReportStatus)
  status?: QuestionReportStatus;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number = 20;
}
