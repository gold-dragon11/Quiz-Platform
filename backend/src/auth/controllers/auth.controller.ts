import { Controller } from '@nestjs/common';
import { AuthService } from '../services/auth.service';

/**
 * Authentication endpoints are specified in docs/04-api/authentication.md and
 * are added in the phases that follow — register, verify-email,
 * resend-verification, login, logout, refresh, forgot-password, reset-password,
 * and me.
 *
 * No routes are registered yet; this controller exists so the module structure
 * is complete and wired.
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
}
