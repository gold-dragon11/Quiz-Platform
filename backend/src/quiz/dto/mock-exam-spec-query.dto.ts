import {
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';

/** Query for GET /api/v1/quiz/mock-exam/spec: a subject or a block, one of them. */
export class MockExamSpecQueryDto {
  @ValidateIf((dto: MockExamSpecQueryDto) => dto.block === undefined)
  @IsUUID()
  subjectId?: string;

  @ValidateIf((dto: MockExamSpecQueryDto) => dto.subjectId === undefined)
  @IsString()
  @MaxLength(64)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  block?: string;
}
