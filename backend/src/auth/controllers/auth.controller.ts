import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { RegisterDto } from '../dto/register.dto';
import { AuthService } from '../services/auth.service';

/**
 * Authentication endpoints (docs/04-api/authentication.md).
 *
 * Registration is implemented here. The remaining documented endpoints —
 * verify-email, resend-verification, login, logout, refresh, forgot-password,
 * reset-password, and me — are added in later phases.
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /api/v1/auth/register — creates an account and the records it owns.
   * Responds 201 Created with no body, as documented
   * (docs/04-api/authentication.md §4).
   */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() registerDto: RegisterDto): Promise<void> {
    await this.authService.register(registerDto);
  }
}
