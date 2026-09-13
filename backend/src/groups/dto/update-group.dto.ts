import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/**
 * Body of PATCH /api/v1/teacher/groups/:groupId.
 *
 * Only the name. The subject is fixed at creation — moving a group between
 * subjects would leave its assignments drawing from a bank the group no longer
 * belongs to. The invite code has its own endpoint, and archiving has another:
 * both are actions with consequences, not fields to edit in passing.
 */
export class UpdateGroupDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;
}
