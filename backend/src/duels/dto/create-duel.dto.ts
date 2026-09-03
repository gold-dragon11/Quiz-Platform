import { Type } from 'class-transformer';
import { IsInt, IsString, IsUUID, Max, Min, ValidateIf } from 'class-validator';

/**
 * Body of POST /api/v1/duels.
 *
 * The opponent is named, not matched. At this size a random queue would leave
 * somebody watching a spinner, and an empty search for an opponent reads worse
 * than no button at all — so a duel starts the way it does in a classroom, by
 * challenging somebody you know.
 */
export class CreateDuelDto {
  /** The opponent's username — what one learner actually knows about another. */
  @IsString()
  opponentUsername!: string;

  @IsUUID()
  subjectId!: string;

  @ValidateIf((dto: CreateDuelDto) => dto.topicId !== undefined)
  @IsUUID()
  topicId?: string;

  /** Short by design: a duel is a round, not a sitting. */
  @ValidateIf((dto: CreateDuelDto) => dto.questionCount !== undefined)
  @Type(() => Number)
  @IsInt()
  @Min(3)
  @Max(20)
  questionCount?: number;
}
