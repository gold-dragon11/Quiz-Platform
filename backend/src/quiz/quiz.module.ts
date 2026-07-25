import { Module } from '@nestjs/common';
import { QuizzesModule } from '../quizzes/quizzes.module';
import { SettingsModule } from '../settings/settings.module';
import { StatisticsModule } from '../statistics/statistics.module';
import { QuizController } from './controllers/quiz.controller';
import { QuestionAttemptRepository } from './repositories/question-attempt.repository';
import { QuizSessionRepository } from './repositories/quiz-session.repository';
import { ResultRepository } from './repositories/result.repository';
import { QuizService } from './services/quiz.service';

/**
 * Quiz module (docs/06-backend/architecture.md §6) — the quiz engine: session
 * lifecycle, answer submission, scoring, and review. Depends on Settings for
 * locale resolution, Statistics for the completion hook, and Quizzes for the
 * stored-Quiz start path (Phase 5.6), each through its public service
 * interface only. The dependency on Quizzes is one-way — Quizzes never
 * imports the engine.
 */
@Module({
  imports: [SettingsModule, StatisticsModule, QuizzesModule],
  controllers: [QuizController],
  providers: [
    QuizService,
    QuizSessionRepository,
    QuestionAttemptRepository,
    ResultRepository,
  ],
})
export class QuizModule {}
