import { IsUUID } from 'class-validator';

/**
 * Body of POST /api/v1/quiz/mock-exam/start.
 *
 * Only the subject. Everything else about a mock sitting — how many questions,
 * how long, how they are weighted — is fixed by the specification, because a
 * mock a student can configure is just a quiz with a longer name.
 */
export class StartMockExamDto {
  @IsUUID()
  subjectId!: string;
}
