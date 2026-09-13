import { Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AdminOnly } from '../../auth/decorators/admin-only.decorator';
import { NotificationsService } from '../services/notifications.service';

/**
 * Manual trigger for the deadline sweep (docs/04-api/admin.md).
 *
 * Exists because the schedule cannot be trusted to a sleeping instance: on the
 * free hosting tier the process is stopped between requests, so an in-process
 * timer simply does not fire. An endpoint an external scheduler can call — a
 * platform cron job, or anything that can make an HTTP request once a day —
 * keeps the feature working regardless of how the application is hosted.
 *
 * Safe to call as often as anyone likes: the dispatch record decides who has
 * already been written to, so a second call the same day sends nothing.
 */
@AdminOnly()
@Controller('admin/notifications')
export class AdminNotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /** POST /api/v1/admin/notifications/due-reminders */
  @Post('due-reminders')
  @HttpCode(HttpStatus.OK)
  async sendDueReminders(): Promise<{ sent: number }> {
    return { sent: await this.notificationsService.sendDueReminders() };
  }
}
