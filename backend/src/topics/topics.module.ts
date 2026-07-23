import { Module } from '@nestjs/common';
import { SettingsModule } from '../settings/settings.module';
import { SubjectsModule } from '../subjects/subjects.module';
import { AdminTopicsController } from './controllers/admin-topics.controller';
import { PublicTopicsController } from './controllers/public-topics.controller';
import { TopicsRepository } from './repositories/topics.repository';
import { TopicsService } from './services/topics.service';

/**
 * Topics module (docs/06-backend/architecture.md §6) — owns the Topic domain:
 * administrative CRUD now, public read endpoints in a later phase. Depends on
 * the Subjects module only through its public service interface, to validate
 * the parent subject (docs/06-backend/architecture.md §11).
 */
@Module({
  imports: [SubjectsModule, SettingsModule],
  controllers: [AdminTopicsController, PublicTopicsController],
  providers: [TopicsService, TopicsRepository],
  exports: [TopicsService],
})
export class TopicsModule {}
