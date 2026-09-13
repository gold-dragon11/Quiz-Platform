import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/**
 * Body of POST /api/v1/groups/join.
 *
 * Accepts the code as typed. Trimming, upper-casing and stripping the spaces a
 * student pastes along with it happens in the service, so the API does not
 * reject a code that is correct but untidy.
 */
export class JoinGroupDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  inviteCode!: string;
}
