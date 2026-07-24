import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { UpdateSettingsDto } from '../dto/update-settings.dto';
import { UserSettingsRecord } from '../repositories/settings.repository';
import { SettingsService } from '../services/settings.service';

/**
 * Settings endpoints (docs/04-api/users.md §11). Authenticated and self-only —
 * every operation is scoped to the current user (decision D11).
 */
@UseGuards(JwtAuthGuard)
@Controller('users/me/settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  /** GET /api/v1/users/me/settings — the user's application preferences. */
  @Get()
  async getSettings(
    @CurrentUser('id') userId: string,
  ): Promise<UserSettingsRecord> {
    return this.settingsService.getSettings(userId);
  }

  /** PATCH /api/v1/users/me/settings — partial update of preferences. */
  @Patch()
  async updateSettings(
    @CurrentUser('id') userId: string,
    @Body() updateSettingsDto: UpdateSettingsDto,
  ): Promise<UserSettingsRecord> {
    return this.settingsService.updateSettings(userId, updateSettingsDto);
  }
}
