import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';

/**
 * Body of POST /api/v1/teacher/groups (docs/02-domain/group.md §4).
 *
 * The subject is required and immutable afterwards: a group is scoped to one
 * subject (decision 05) so the assignment builder and the group analytics read
 * unambiguously. A teacher who works two subjects with the same children keeps
 * two groups.
 *
 * The invite code is not accepted — the server generates it.
 */
export class CreateGroupDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @IsUUID()
  subjectId!: string;
}
