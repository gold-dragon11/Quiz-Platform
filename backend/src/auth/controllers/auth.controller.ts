import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../decorators/current-user.decorator';
import { LoginDto } from '../dto/login.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { RegisterDto } from '../dto/register.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { AuthService } from '../services/auth.service';
import { CurrentUserResponse } from '../types/current-user-response.type';
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

  /**
   * POST /api/v1/auth/refresh — exchanges a valid refresh token for a new
   * token pair; the presented token is rotated out in the same operation
   * (docs/04-api/authentication.md §8).
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() refreshTokenDto: RefreshTokenDto): Promise<TokenPair> {
    return this.authService.refresh(refreshTokenDto);
  }

  /**
   * POST /api/v1/auth/logout — invalidates the presented refresh token.
   * Idempotent: responds 204 whether or not the token was active
   * (docs/04-api/authentication.md §7).
   */
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Body() refreshTokenDto: RefreshTokenDto): Promise<void> {
    await this.authService.logout(refreshTokenDto);
  }

  /**
   * GET /api/v1/auth/me — returns the authenticated user's session summary
   * (docs/04-api/authentication.md §11).
   *
   * JwtAuthGuard rejects a missing, malformed, or expired token, and its
   * strategy additionally rejects any account that is no longer Active. Only
   * the user id is taken from the request; the record itself is loaded from
   * the database.
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getCurrentUser(
    @CurrentUser('id') userId: string,
  ): Promise<CurrentUserResponse> {
    return this.authService.getCurrentUser(userId);
  }
}
