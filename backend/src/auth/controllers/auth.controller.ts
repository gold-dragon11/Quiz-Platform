import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../decorators/current-user.decorator';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { LoginDto } from '../dto/login.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { RegisterDto } from '../dto/register.dto';
import { ResendVerificationDto } from '../dto/resend-verification.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { VerifyEmailDto } from '../dto/verify-email.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { AuthService } from '../services/auth.service';
import { CurrentUserResponse } from '../types/current-user-response.type';
import { TokenPair } from '../types/token-pair.type';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

/**
 * Per-route rate limits, tighter than the global default. Two kinds of route
 * need them: those that guard a credential, where an unlimited request rate
 * is an offline password guess made online, and those that send email, where
 * each request spends provider quota and a burst of mail to addresses that
 * never asked for it damages the sending domain's reputation.
 *
 * The limits are counted per client address, so users behind one NAT — a
 * school, a mobile carrier — share an allowance. They are set loosely enough
 * that a shared address doing legitimate work will not reach them.
 */
const LOGIN_LIMIT = { default: { limit: 10, ttl: MINUTE } };
const REGISTER_LIMIT = { default: { limit: 10, ttl: HOUR } };
const EMAIL_SEND_LIMIT = { default: { limit: 5, ttl: HOUR } };
const TOKEN_SUBMIT_LIMIT = { default: { limit: 20, ttl: HOUR } };

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
  @Throttle(REGISTER_LIMIT)
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() registerDto: RegisterDto): Promise<void> {
    await this.authService.register(registerDto);
  }

  /**
   * POST /api/v1/auth/login — authenticates a user and returns an access and
   * refresh token pair (docs/04-api/authentication.md §6).
   */
  @Post('login')
  @Throttle(LOGIN_LIMIT)
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto): Promise<TokenPair> {
    return this.authService.login(loginDto);
  }

  /**
   * POST /api/v1/auth/verify-email — activates the account identified by a
   * valid verification token and signs the reader straight into it
   * (docs/04-api/authentication.md §5). Responds 200 with a token pair, the
   * same shape as login; every failure is the same generic 400.
   */
  @Post('verify-email')
  @Throttle(TOKEN_SUBMIT_LIMIT)
  @HttpCode(HttpStatus.OK)
  async verifyEmail(
    @Body() verifyEmailDto: VerifyEmailDto,
  ): Promise<TokenPair> {
    return this.authService.verifyEmail(verifyEmailDto);
  }

  /**
   * POST /api/v1/auth/resend-verification — re-sends the verification email
   * (docs/04-api/authentication.md §5). Always responds 202 with an empty
   * body so the endpoint cannot reveal which addresses are registered.
   */
  @Post('resend-verification')
  @Throttle(EMAIL_SEND_LIMIT)
  @HttpCode(HttpStatus.ACCEPTED)
  async resendVerification(
    @Body() resendVerificationDto: ResendVerificationDto,
  ): Promise<void> {
    await this.authService.resendVerification(resendVerificationDto);
  }

  /**
   * POST /api/v1/auth/forgot-password — starts password recovery
   * (docs/04-api/authentication.md §9). Always responds 202 with an empty
   * body regardless of whether the email exists or an email was sent.
   */
  @Post('forgot-password')
  @Throttle(EMAIL_SEND_LIMIT)
  @HttpCode(HttpStatus.ACCEPTED)
  async forgotPassword(
    @Body() forgotPasswordDto: ForgotPasswordDto,
  ): Promise<void> {
    await this.authService.forgotPassword(forgotPasswordDto);
  }

  /**
   * POST /api/v1/auth/reset-password — sets a new password using a valid
   * reset token (docs/04-api/authentication.md §10). Responds 200 with an
   * empty body; every token failure is the same generic 400.
   */
  @Post('reset-password')
  @Throttle(TOKEN_SUBMIT_LIMIT)
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Body() resetPasswordDto: ResetPasswordDto,
  ): Promise<void> {
    await this.authService.resetPassword(resetPasswordDto);
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
