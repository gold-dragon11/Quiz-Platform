import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { normalizeEmail } from '../../common/transformers/normalize.transformer';

/**
 * Login payload (docs/04-api/authentication.md §6).
 *
 * The email is normalized exactly as it is at registration, so an account is
 * reachable regardless of the casing the client sends.
 *
 * The password is only checked for presence. Applying the registration
 * complexity rules here would reveal the password policy to unauthenticated
 * callers and would reject accounts created under an earlier policy — an
 * incorrect password must fail authentication, not validation.
 */
export class LoginDto {
  @Transform(normalizeEmail)
  @IsNotEmpty()
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}
