import { IsNotEmpty, IsString } from 'class-validator';

/**
 * Body of PUT /api/v1/users/me/avatar (docs/04-api/users.md §10). The id must
 * name a predefined avatar; the service validates it against the catalog and
 * rejects unknown ids with 400 (decision D7).
 */
export class SelectAvatarDto {
  @IsString()
  @IsNotEmpty()
  predefinedAvatarId!: string;
}
