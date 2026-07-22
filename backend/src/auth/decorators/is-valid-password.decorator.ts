import { applyDecorators } from '@nestjs/common';
import { IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';

/**
 * The platform password policy (docs/01-prd/authentication.md §6,
 * docs/04-api/authentication.md §12, docs/06-backend/security.md §4), defined
 * once so registration and password reset enforce byte-identical rules and
 * error messages.
 *
 * Split into one rule per requirement so the response names the exact failing
 * constraint (docs/06-backend/validation.md §13-14).
 */
export function IsValidPassword(): PropertyDecorator {
  return applyDecorators(
    IsString(),
    IsNotEmpty(),
    MinLength(8, { message: 'password must be at least 8 characters long' }),
    Matches(/[A-Z]/, {
      message: 'password must contain at least one uppercase letter',
    }),
    Matches(/[a-z]/, {
      message: 'password must contain at least one lowercase letter',
    }),
    Matches(/[0-9]/, { message: 'password must contain at least one number' }),
    Matches(/[^A-Za-z0-9]/, {
      message: 'password must contain at least one special character',
    }),
  );
}
