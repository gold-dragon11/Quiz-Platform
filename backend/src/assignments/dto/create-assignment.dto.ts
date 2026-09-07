import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsDate,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { ExplanationVisibility, ScoredAttempt } from '@prisma/client';

/** How the question list is assembled (docs/02-domain/assignment.md §5). */
export enum QuestionSelectionMode {
  /** The teacher picked specific questions. */
  MANUAL = 'MANUAL',
  /** N questions from one topic, chosen by the system. */
  TOPIC = 'TOPIC',
  /** A mix by difficulty, optionally narrowed to one topic. */
  DIFFICULTY = 'DIFFICULTY',
  /**
   * Drawn from the topics this group gets wrong most often. The mode that
   * turns the group's own results into the next lesson — and the reason the
   * review screens exist at all.
   */
  MISTAKES = 'MISTAKES',
}

/**
 * Upper bound on one assignment. Not a technical limit — a homework of more
 * than fifty questions is a different thing, and a teacher who wants one is
 * better served by two assignments.
 */
export const MAX_QUESTIONS_PER_ASSIGNMENT = 50;

/**
 * Body of POST /api/v1/teacher/groups/:groupId/assignments.
 *
 * The question list and the recipients are resolved once, here, and then frozen
 * (docs/02-domain/assignment.md §3). Nothing in this DTO can be changed
 * afterwards except the title, the description and the deadline.
 *
 * `studentIds` may be omitted, which means the whole group as it stands at this
 * moment — not as it will stand later.
 */
export class CreateAssignmentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @ValidateIf((dto: CreateAssignmentDto) => dto.description !== undefined)
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ValidateIf((dto: CreateAssignmentDto) => dto.openAt !== undefined)
  @Type(() => Date)
  @IsDate()
  openAt?: Date;

  @Type(() => Date)
  @IsDate()
  dueAt!: Date;

  @ValidateIf((dto: CreateAssignmentDto) => dto.attemptsAllowed !== undefined)
  @IsInt()
  @Min(1)
  @Max(10)
  attemptsAllowed?: number;

  @ValidateIf((dto: CreateAssignmentDto) => dto.scoredAttempt !== undefined)
  @IsEnum(ScoredAttempt)
  scoredAttempt?: ScoredAttempt;

  @ValidateIf((dto: CreateAssignmentDto) => dto.explanations !== undefined)
  @IsEnum(ExplanationVisibility)
  explanations?: ExplanationVisibility;

  @IsEnum(QuestionSelectionMode)
  mode!: QuestionSelectionMode;

  /** MANUAL only. */
  @ValidateIf(
    (dto: CreateAssignmentDto) => dto.mode === QuestionSelectionMode.MANUAL,
  )
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_QUESTIONS_PER_ASSIGNMENT)
  @ArrayUnique()
  @IsUUID('4', { each: true })
  questionIds?: string[];

  /** Required for TOPIC, optional for DIFFICULTY. */
  @ValidateIf(
    (dto: CreateAssignmentDto) =>
      dto.mode === QuestionSelectionMode.TOPIC || dto.topicId !== undefined,
  )
  @IsUUID()
  topicId?: string;

  /**
   * How many questions to draw — required by TOPIC and by MISTAKES.
   *
   * MISTAKES was missing from this condition, and the omission was invisible
   * because every caller happened to send a count. Without one the draw
   * compared its progress against `undefined`, took `NaN` questions, and ended
   * with an empty list — so the teacher was told the bank was short of
   * questions when in fact they had left a field out. A wrong diagnosis costs
   * more than a blunt one.
   */
  @ValidateIf(
    (dto: CreateAssignmentDto) =>
      dto.mode === QuestionSelectionMode.TOPIC ||
      dto.mode === QuestionSelectionMode.MISTAKES,
  )
  @IsInt()
  @Min(1)
  @Max(MAX_QUESTIONS_PER_ASSIGNMENT)
  count?: number;

  /** DIFFICULTY only — at least one of the three must be above zero. */
  @ValidateIf(
    (dto: CreateAssignmentDto) => dto.mode === QuestionSelectionMode.DIFFICULTY,
  )
  @IsInt()
  @Min(0)
  @Max(MAX_QUESTIONS_PER_ASSIGNMENT)
  beginner?: number;

  @ValidateIf(
    (dto: CreateAssignmentDto) => dto.mode === QuestionSelectionMode.DIFFICULTY,
  )
  @IsInt()
  @Min(0)
  @Max(MAX_QUESTIONS_PER_ASSIGNMENT)
  intermediate?: number;

  @ValidateIf(
    (dto: CreateAssignmentDto) => dto.mode === QuestionSelectionMode.DIFFICULTY,
  )
  @IsInt()
  @Min(0)
  @Max(MAX_QUESTIONS_PER_ASSIGNMENT)
  advanced?: number;

  /** Omitted means every current member of the group. */
  @ValidateIf((dto: CreateAssignmentDto) => dto.studentIds !== undefined)
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsUUID('4', { each: true })
  studentIds?: string[];
}
