import { IsNotEmpty, IsString } from 'class-validator';

/**
 * Body accepted by POST /auth/refresh and POST /auth/logout
 * (docs/04-api/authentication.md §7-8).
 *
 * Deliberately validated only for presence: a malformed token must fail
 * authentication on refresh (401) and be ignored by idempotent logout (204) —
 * neither is a validation error.
 */
export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}
