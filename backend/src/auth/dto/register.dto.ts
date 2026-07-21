import { Language } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  Matches,
} from 'class-validator';
import {
  normalizeEmail,
  trim,
} from '../../common/transformers/normalize.transformer';

/**
 * Registration payload — exactly the fields documented in
 * docs/04-api/authentication.md §4. Display name and avatar are not collected;
 * they are derived automatically (docs/01-prd/authentication.md §3).
 */
export class RegisterDto {
  @Transform(normalizeEmail)
  @IsNotEmpty()
  @IsEmail()
  email!: string;

  // docs/01-prd/authentication.md §6, docs/04-api/authentication.md §12.
  // Split into one rule per requirement so the response names the exact
  // failing constraint (docs/06-backend/validation.md §13-14).
  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'password must be at least 8 characters long' })
  @Matches(/[A-Z]/, {
    message: 'password must contain at least one uppercase letter',
  })
  @Matches(/[a-z]/, {
    message: 'password must contain at least one lowercase letter',
  })
  @Matches(/[0-9]/, { message: 'password must contain at least one number' })
  @Matches(/[^A-Za-z0-9]/, {
    message: 'password must contain at least one special character',
  })
  password!: string;

  // docs/02-domain/profile.md §6: unique, 3-30 characters, letters, numbers,
  // and underscores only. Uniqueness is enforced by the service.
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(30)
  @Matches(/^[A-Za-z0-9_]+$/, {
    message: 'username may only contain letters, numbers, and underscores',
  })
  username!: string;

  // docs/04-api/authentication.md §4: optional, defaults to English when omitted.
  @IsOptional()
  @IsEnum(Language)
  preferredLanguage?: Language;
}
