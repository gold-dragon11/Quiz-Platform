import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { trim } from '../../common/transformers/normalize.transformer';

/**
 * Body of PATCH /api/v1/users/me/profile (docs/04-api/users.md §9).
 *
 * Merge semantics (decision D2): only supplied fields change. `displayName`
 * and `username` are required when present; `bio` is nullable and an explicit
 * `null` clears it. Username rules mirror registration
 * (docs/02-domain/profile.md §6).
 */
export class UpdateProfileDto {
  @ValidateIf((dto: UpdateProfileDto) => dto.displayName !== undefined)
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  displayName?: string;

  @ValidateIf((dto: UpdateProfileDto) => dto.username !== undefined)
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(30)
  @Matches(/^[A-Za-z0-9_]+$/, {
    message: 'username may only contain letters, numbers, and underscores',
  })
  username?: string;

  @ValidateIf(
    (dto: UpdateProfileDto) => dto.bio !== undefined && dto.bio !== null,
  )
  @Transform(trim)
  @IsString()
  @MaxLength(250)
  bio?: string | null;
}
