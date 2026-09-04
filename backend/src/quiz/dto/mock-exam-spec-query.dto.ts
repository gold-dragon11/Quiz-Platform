import { IsUUID } from 'class-validator';

/** Query for GET /api/v1/quiz/mock-exam/spec. */
export class MockExamSpecQueryDto {
  /** Required: the paper is defined per subject, so there is no "any". */
  @IsUUID()
  subjectId!: string;
}
