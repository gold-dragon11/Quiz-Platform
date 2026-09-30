import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { AppConfig } from '../../config/configuration';
import { byAccount, byAddress } from '../../common/throttle/request-trackers';
import { CurrentUser } from '../decorators/current-user.decorator';
import { RefreshCookie } from '../decorators/refresh-cookie.decorator';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';
import { ResendVerificationDto } from '../dto/resend-verification.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { VerifyEmailDto } from '../dto/verify-email.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { AuthService } from '../services/auth.service';
import { clearRefreshCookie, setRefreshCookie } from '../session-cookie';
import { CurrentUserResponse } from '../types/current-user-response.type';
import { AccessTokenResponse, TokenPair } from '../types/token-pair.type';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

/**
 * Per-route rate limits, tighter than the global default. Two kinds of route
 * need them: those that guard a credential, where an unlimited request rate
 * is an offline password guess made online, and those that send email, where
 * each request spends provider quota and a burst of mail to addresses that
 * never asked for it damages the sending domain's reputation.
 *
 * Users behind one NAT — a school, a mobile carrier — share a client address,
 * so limits that must hold per person are counted per account instead, and
 * the address limits are sized for a class of about thirty-five signing up,
 * confirming and logging in from one room (docs/06-backend/security.md §12).
 *
 * - Login: ten attempts a minute per account, wherever they come from, and a
 *   hundred per address — enough for a class, not for guessing across many
 *   accounts from one machine.
 * - Registration and token submission: per address, and explicitly so — a
 *   bearer token would otherwise buy a fresh allowance per account.
 * - Email-sending routes: three a message per address of mail an hour, so one
 *   inbox cannot be flooded, and twenty per network address.
 */
const LOGIN_LIMIT = {
  default: { limit: 10, ttl: MINUTE, getTracker: byAccount },
  address: { limit: 100, ttl: MINUTE },
};
const REGISTER_LIMIT = {
  default: { limit: 40, ttl: HOUR, getTracker: byAddress },
};
const EMAIL_SEND_LIMIT = {
  default: { limit: 3, ttl: HOUR, getTracker: byAccount },
  address: { limit: 20, ttl: HOUR },
};
const TOKEN_SUBMIT_LIMIT = {
  default: { limit: 40, ttl: HOUR, getTracker: byAddress },
};

/**
 * Authentication endpoints (docs/04-api/authentication.md).
 *
 * Registration is implemented here. The remaining documented endpoints —
 * verify-email, resend-verification, login, logout, refresh, forgot-password,
 * reset-password, and me — are added in later phases.
 */
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService<AppConfig, true>,
  ) {}

  /**
   * Splits a freshly issued pair the way it leaves the server: the access
   * token in the body for the page to hold in memory, the refresh token into
   * an HttpOnly cookie the page can never read (src/auth/session-cookie.ts).
   */
  private establishSession(
    res: Response,
    tokens: TokenPair,
  ): AccessTokenResponse {
    setRefreshCookie(
      res,
      tokens.refreshToken,
      tokens.refreshExpiresAt,
      this.configService.get('session', { infer: true }),
    );
    return { accessToken: tokens.accessToken };
  }

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
   * POST /api/v1/auth/login — authenticates a user, returns an access token
   * and sets the session cookie (docs/04-api/authentication.md §6).
   */
  @Post('login')
  @Throttle(LOGIN_LIMIT)
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AccessTokenResponse> {
    return this.establishSession(res, await this.authService.login(loginDto));
  }

  /**
   * POST /api/v1/auth/verify-email — activates the account identified by a
   * valid verification token and signs the reader straight into it
   * (docs/04-api/authentication.md §5). Responds exactly as login does —
   * access token in the body, session in the cookie; every failure is the
   * same generic 400.
   */
  @Post('verify-email')
  @Throttle(TOKEN_SUBMIT_LIMIT)
  @HttpCode(HttpStatus.OK)
  async verifyEmail(
    @Body() verifyEmailDto: VerifyEmailDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AccessTokenResponse> {
    return this.establishSession(
      res,
      await this.authService.verifyEmail(verifyEmailDto),
    );
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
   * POST /api/v1/auth/refresh — exchanges the session cookie for a fresh
   * access token and a rotated cookie (docs/04-api/authentication.md §8).
   *
   * No cookie is the same answer as a bad one: a bare 401. The page cannot
   * see the cookie, so it calls this once on startup and reads the answer as
   * «signed in» or «not signed in».
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @RefreshCookie() refreshToken: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AccessTokenResponse> {
    if (!refreshToken) {
      throw new UnauthorizedException();
    }
    return this.establishSession(
      res,
      await this.authService.refresh(refreshToken),
    );
  }

  /**
   * POST /api/v1/auth/logout — revokes the session and removes its cookie.
   * Idempotent: responds 204 whether or not there was a session to end
   * (docs/04-api/authentication.md §7).
   *
   * The cookie is cleared even when no token arrived, so a reader who ends up
   * here holding something expired or unrecognised leaves without it.
   */
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @RefreshCookie() refreshToken: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }
    clearRefreshCookie(res, this.configService.get('session', { infer: true }));
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
