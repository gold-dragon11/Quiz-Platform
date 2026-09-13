import {
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';

/**
 * Body of POST /api/v1/quiz/mock-exam/start.
 *
 * A subject, or a joint NMT block — exactly one. Everything else about a mock
 * sitting — how many questions, how long, how they are weighted — is fixed by
 * the paper, because a mock a student can configure is just a quiz with a
 * longer name.
 */
export class StartMockExamDto {
  @ValidateIf((dto: StartMockExamDto) => dto.block === undefined)
  @IsUUID()
  subjectId?: string;

  /** A block's slug (docs/02-domain/nmt-paper.md §8). */
  @ValidateIf((dto: StartMockExamDto) => dto.subjectId === undefined)
  @IsString()
  @MaxLength(64)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  block?: string;
}
