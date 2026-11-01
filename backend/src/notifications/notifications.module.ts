import { Module } from '@nestjs/common';
import { EmailModule } from '../email/email.module';
import { AdminNotificationsController } from './controllers/admin-notifications.controller';
import { UnsubscribeController } from './controllers/unsubscribe.controller';
import { EmailDispatchService } from './services/email-dispatch.service';
import { MistakesEmailService } from './services/mistakes-email.service';
import { NotificationsService } from './services/notifications.service';

/**
 * Email notifications (docs/06-backend/architecture.md §6): homework
 * (decision 25) and the afternoon mistakes email (decision 48). Exported so
 * AssignmentsModule can announce a new assignment the moment it is issued and
 * the hourly sweep can send what is due.
 */
@Module({
  imports: [EmailModule],
  controllers: [AdminNotificationsController, UnsubscribeController],
  providers: [NotificationsService, EmailDispatchService, MistakesEmailService],
  exports: [NotificationsService, MistakesEmailService],
})
export class NotificationsModule {}
