import { Module } from '@nestjs/common';
import { SubjectsModule } from '../subjects/subjects.module';
import { TopicsModule } from '../topics/topics.module';
import { AdminQuizzesController } from './controllers/admin-quizzes.controller';
import { QuizConfigRepository } from './repositories/quiz-config.repository';
import { QuizConfigService } from './services/quiz-config.service';

/**
 * Quizzes module (docs/06-backend/architecture.md §6) — owns the reusable
 * quiz *configuration* admin surface (docs/04-api/admin.md §8). Deliberately
 * separate from the Quiz *engine* module (session lifecycle, scoring, XP),
 * which it never touches. Depends on Subjects and Topics only through their
 * public service interfaces, to validate the parent subject and topic.
 */
@Module({
  imports: [SubjectsModule, TopicsModule],
  controllers: [AdminQuizzesController],
  providers: [QuizConfigService, QuizConfigRepository],
})
export class QuizzesModule {}
