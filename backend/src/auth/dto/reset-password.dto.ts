import { IsNotEmpty, IsString } from 'class-validator';
import { IsValidPassword } from '../decorators/is-valid-password.decorator';

/**
 * Body accepted by POST /auth/reset-password
 * (docs/04-api/authentication.md §10).
 *
 * The token is validated for presence only — a malformed token must fail with
 * the generic 400, not a distinguishable validation error. The new password is
 * validated with exactly the registration policy.
 */
export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  token!: string;

  @IsValidPassword()
  newPassword!: string;
}
