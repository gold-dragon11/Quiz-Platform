import { Module } from '@nestjs/common';
import { EmailModule } from '../email/email.module';
import { AdminNotificationsController } from './controllers/admin-notifications.controller';
import { NotificationsService } from './services/notifications.service';

/**
 * Assignment notifications (docs/06-backend/architecture.md §6). Exported so
 * AssignmentsModule can announce a new assignment the moment it is issued.
 */
@Module({
  imports: [EmailModule],
  controllers: [AdminNotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
