import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Put,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { ChangePasswordDto } from '../../auth/dto/change-password.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AuthService } from '../../auth/services/auth.service';
import { SelectAvatarDto } from '../dto/select-avatar.dto';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { UsersService } from '../services/users.service';
import {
  AvatarView,
  MyAccount,
  MyProfile,
  PublicProfile,
} from '../types/users.types';

/**
 * User account, profile, avatar, and public-profile endpoints
 * (docs/04-api/users.md §4, §6-7, §9-10, §12).
 *
 * The `/users/me/*` routes are authenticated and self-only (JwtAuthGuard,
 * per-method). `GET /users/{username}` is public — no guard — so the guards
 * are applied per handler rather than on the class (decision D11).
 *
 * Password change and account deletion delegate to AuthService, which owns
 * all credential and session logic (decision A8) — the Users module never
 * touches credentials directly.
 */
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
  ) {}

  /** GET /api/v1/users/me — the authenticated user's account information. */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMyAccount(@CurrentUser('id') userId: string): Promise<MyAccount> {
    return this.usersService.getMyAccount(userId);
  }

  /** GET /api/v1/users/me/profile — the authenticated user's own profile. */
  @Get('me/profile')
  @UseGuards(JwtAuthGuard)
  async getMyProfile(@CurrentUser('id') userId: string): Promise<MyProfile> {
    return this.usersService.getMyProfile(userId);
  }

  /** PATCH /api/v1/users/me/profile — partial profile update. */
  @Patch('me/profile')
  @UseGuards(JwtAuthGuard)
  async updateMyProfile(
    @CurrentUser('id') userId: string,
    @Body() updateProfileDto: UpdateProfileDto,
  ): Promise<MyProfile> {
    return this.usersService.updateMyProfile(userId, updateProfileDto);
  }

  /**
   * PATCH /api/v1/users/me/password — changes the password. Responds 204;
   * all refresh sessions are revoked (docs/04-api/users.md §6, decision A2).
   */
  @Patch('me/password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async changePassword(
    @CurrentUser('id') userId: string,
    @Body() changePasswordDto: ChangePasswordDto,
  ): Promise<void> {
    await this.authService.changePassword(userId, changePasswordDto);
  }

  /** GET /api/v1/users/me/avatar — the authenticated user's active avatar. */
  @Get('me/avatar')
  @UseGuards(JwtAuthGuard)
  async getMyAvatar(@CurrentUser('id') userId: string): Promise<AvatarView> {
    return this.usersService.getMyAvatar(userId);
  }

  /** PUT /api/v1/users/me/avatar — select a predefined avatar. */
  @Put('me/avatar')
  @UseGuards(JwtAuthGuard)
  async selectAvatar(
    @CurrentUser('id') userId: string,
    @Body() selectAvatarDto: SelectAvatarDto,
  ): Promise<AvatarView> {
    return this.usersService.selectAvatar(userId, selectAvatarDto);
  }

  /**
   * DELETE /api/v1/users/me — soft-deletes the account (docs/04-api/users.md
   * §7, decisions A5/A6). Responds 204; all refresh sessions are revoked and
   * historical data is preserved.
   */
  @Delete('me')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAccount(@CurrentUser('id') userId: string): Promise<void> {
    await this.authService.deleteAccount(userId);
  }

  /**
   * GET /api/v1/users/{username} — a user's public profile. Public route
   * (no guard); a private, missing, or non-active profile is 404.
   */
  @Get(':username')
  async getPublicProfile(
    @Param('username') username: string,
  ): Promise<PublicProfile> {
    return this.usersService.getPublicProfile(username);
  }
}
