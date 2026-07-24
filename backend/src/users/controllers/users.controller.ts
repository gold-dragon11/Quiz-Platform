import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Put,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { SelectAvatarDto } from '../dto/select-avatar.dto';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { UsersService } from '../services/users.service';
import { AvatarView, MyProfile, PublicProfile } from '../types/users.types';

/**
 * User profile, avatar, and public-profile endpoints (docs/04-api/users.md
 * §9-10, §12).
 *
 * The `/users/me/*` routes are authenticated and self-only (JwtAuthGuard,
 * per-method). `GET /users/{username}` is public — no guard — so the guards
 * are applied per handler rather than on the class (decision D11).
 */
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

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
