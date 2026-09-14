import { Module } from '@nestjs/common';
import { DuelsModule } from '../duels/duels.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { QuizModule } from '../quiz/quiz.module';
import { JobsController } from './controllers/jobs.controller';
import { CronSecretGuard } from './guards/cron-secret.guard';
import { JobsService } from './services/jobs.service';

/**
 * Scheduled work (docs/06-backend/architecture.md §6). Owns no rules of its
 * own: each step lives in the module whose data it touches, and this one only
 * decides when they run and who may ask.
 */
@Module({
  imports: [QuizModule, NotificationsModule, DuelsModule],
  controllers: [JobsController],
  providers: [JobsService, CronSecretGuard],
})
export class JobsModule {}
