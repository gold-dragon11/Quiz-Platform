import { IsNotEmpty, IsString } from 'class-validator';

/**
 * Body accepted by POST /auth/verify-email
 * (docs/04-api/authentication.md §5).
 *
 * Validated for presence only — a malformed token must fail verification with
 * the generic 400, not surface a distinguishable validation error.
 */
export class VerifyEmailDto {
  @IsString()
  @IsNotEmpty()
  token!: string;
}
