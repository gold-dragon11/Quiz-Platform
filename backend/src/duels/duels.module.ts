import { Module } from '@nestjs/common';
import { QuizModule } from '../quiz/quiz.module';
import { DuelsController } from './controllers/duels.controller';
import { DuelsRepository } from './repositories/duels.repository';
import { DuelsService } from './services/duels.service';

/**
 * Duels module (docs/06-backend/architecture.md §6). Depends on QuizModule
 * because a duel is played through the ordinary engine — scoring, exposure
 * history, XP and statistics stay single implementations.
 */
@Module({
  imports: [QuizModule],
  controllers: [DuelsController],
  providers: [DuelsService, DuelsRepository],
  // Exported for JobsModule, which expires unanswered challenges on schedule.
  exports: [DuelsService],
})
export class DuelsModule {}
