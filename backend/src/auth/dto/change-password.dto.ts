import { IsNotEmpty, IsString } from 'class-validator';
import { IsValidPassword } from '../decorators/is-valid-password.decorator';

/**
 * Body of PATCH /api/v1/users/me/password (docs/04-api/users.md §6).
 *
 * `newPassword` reuses the shared platform password policy — the exact rules
 * and messages used by registration and password reset. `currentPassword` is
 * only checked for presence here; the service verifies it against the stored
 * hash (decision A3).
 */
export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  currentPassword!: string;

  @IsValidPassword()
  newPassword!: string;
}
