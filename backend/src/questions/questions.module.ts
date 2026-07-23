import { Module } from '@nestjs/common';
import { SettingsModule } from '../settings/settings.module';
import { TopicsModule } from '../topics/topics.module';
import { AdminQuestionsController } from './controllers/admin-questions.controller';
import { PublicQuestionsController } from './controllers/public-questions.controller';
import { QuestionsRepository } from './repositories/questions.repository';
import { QuestionsService } from './services/questions.service';

/**
 * Questions module (docs/06-backend/architecture.md §6) — owns the Question
 * and AnswerOption domain: administrative CRUD now, public read endpoints in
 * a later phase. Depends on the Topics module only through its public
 * service interface, to validate the parent topic
 * (docs/06-backend/architecture.md §11).
 */
@Module({
  imports: [TopicsModule, SettingsModule],
  controllers: [AdminQuestionsController, PublicQuestionsController],
  providers: [QuestionsService, QuestionsRepository],
  exports: [QuestionsService],
})
export class QuestionsModule {}
