import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty } from 'class-validator';
import { normalizeEmail } from '../../common/transformers/normalize.transformer';

/**
 * Body accepted by POST /auth/forgot-password
 * (docs/04-api/authentication.md §9). The email is normalized exactly as at
 * registration and login so the same account is always addressed.
 */
export class ForgotPasswordDto {
  @Transform(normalizeEmail)
  @IsNotEmpty()
  @IsEmail()
  email!: string;
}
