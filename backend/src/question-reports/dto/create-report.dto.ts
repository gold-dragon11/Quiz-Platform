import { QuestionReportReason } from '@prisma/client';
import { IsEnum, IsString, MaxLength, ValidateIf } from 'class-validator';

/**
 * Body of POST /api/v1/questions/:questionId/report.
 *
 * The reason is a fixed list rather than free text: a queue of prose takes
 * longer to triage than the questions themselves, and the five categories
 * cover what actually goes wrong in this bank — a wrong key, a typo, an
 * ambiguous stem, a formula that did not render.
 */
export class CreateReportDto {
  @IsEnum(QuestionReportReason)
  reason!: QuestionReportReason;

  @ValidateIf((dto: CreateReportDto) => dto.comment !== undefined)
  @IsString()
  @MaxLength(1000)
  comment?: string;
}
