import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';
import { AuthService } from '../services/auth.service';
import { TokenPair } from '../types/token-pair.type';

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

  /**
   * POST /api/v1/auth/login — authenticates a user and returns an access and
   * refresh token pair (docs/04-api/authentication.md §6).
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto): Promise<TokenPair> {
    return this.authService.login(loginDto);
  }
}
