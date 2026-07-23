import { Module } from '@nestjs/common';
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
 * locale resolution and Statistics for the completion hook, each through its
 * public service interface only.
 */
@Module({
  imports: [SettingsModule, StatisticsModule],
  controllers: [QuizController],
  providers: [
    QuizService,
    QuizSessionRepository,
    QuestionAttemptRepository,
    ResultRepository,
  ],
})
export class QuizModule {}
