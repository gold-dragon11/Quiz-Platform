import { Type } from 'class-transformer';
import { IsInt, IsUUID, Max, Min, ValidateIf } from 'class-validator';

/**
 * Body of POST /api/v1/quiz/mistake-review/start.
 *
 * Both fields are optional, and that is the design: the common case is a
 * learner tapping "review" with nothing to decide. Narrowing by subject exists
 * for the week before one exam, and the size cap keeps a review a short habit
 * rather than a session someone abandons half-way.
 */
export class StartMistakeReviewDto {
  @ValidateIf((dto: StartMistakeReviewDto) => dto.subjectId !== undefined)
  @IsUUID()
  subjectId?: string;

  @ValidateIf((dto: StartMistakeReviewDto) => dto.questionCount !== undefined)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(30)
  questionCount?: number;
}
