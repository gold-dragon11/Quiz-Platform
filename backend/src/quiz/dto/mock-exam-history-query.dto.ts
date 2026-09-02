import { IsUUID, ValidateIf } from 'class-validator';

/** Query for GET /api/v1/quiz/mock-exam/history. */
export class MockExamHistoryQueryDto {
  /** Omit to see every subject's sittings in one list. */
  @ValidateIf((dto: MockExamHistoryQueryDto) => dto.subjectId !== undefined)
  @IsUUID()
  subjectId?: string;
}
