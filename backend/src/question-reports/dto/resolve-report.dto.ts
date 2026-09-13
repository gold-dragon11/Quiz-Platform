import { QuestionReportStatus } from '@prisma/client';
import { IsIn, IsString, MaxLength, ValidateIf } from 'class-validator';

/**
 * The two states a review may end in. Listed as values rather than expressed
 * through the TypeScript type: `Exclude<>` disappears at compile time, so a
 * request carrying `NEW` sailed past validation and quietly reopened a closed
 * report. Runtime rules need runtime checks.
 */
const TERMINAL_STATUSES = [
  QuestionReportStatus.ACCEPTED,
  QuestionReportStatus.REJECTED,
] as const;

/**
 * Body of PATCH /api/v1/admin/question-reports/:reportId.
 *
 * Only the two terminal states are accepted — a report cannot be moved back to
 * NEW. Reopening is what raising a fresh report is for, and the partial unique
 * index allows exactly that once the old one is closed.
 */
export class ResolveReportDto {
  @IsIn(TERMINAL_STATUSES)
  status!: (typeof TERMINAL_STATUSES)[number];

  @ValidateIf((dto: ResolveReportDto) => dto.resolution !== undefined)
  @IsString()
  @MaxLength(1000)
  resolution?: string;
}
