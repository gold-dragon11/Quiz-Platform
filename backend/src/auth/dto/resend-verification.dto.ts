import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty } from 'class-validator';
import { normalizeEmail } from '../../common/transformers/normalize.transformer';

/**
 * Body accepted by POST /auth/resend-verification
 * (docs/04-api/authentication.md §5). The email is normalized exactly as at
 * registration and login so the same account is always addressed.
 */
export class ResendVerificationDto {
  @Transform(normalizeEmail)
  @IsNotEmpty()
  @IsEmail()
  email!: string;
}
