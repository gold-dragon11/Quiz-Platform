import { Type } from 'class-transformer';
import {
  IsDate,
  IsNotEmpty,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';

/**
 * Body of PATCH /api/v1/teacher/assignments/:assignmentId.
 *
 * Three fields, and deliberately no more (decision 12). The question list is
 * frozen at issue: if it could change, two students in the same group would sit
 * different papers and their scores would stop being comparable. The recipient
 * list is frozen for the same reason the archive rule exists — an assignment is
 * a record of what was set, to whom, and when.
 *
 * The deadline is editable because a teacher misreading a date is ordinary, and
 * the alternative is deleting the assignment and losing what students already
 * submitted.
 */
export class UpdateAssignmentDto {
  @ValidateIf((dto: UpdateAssignmentDto) => dto.title !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title?: string;

  @ValidateIf((dto: UpdateAssignmentDto) => dto.description !== undefined)
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ValidateIf((dto: UpdateAssignmentDto) => dto.dueAt !== undefined)
  @Type(() => Date)
  @IsDate()
  dueAt?: Date;
}
