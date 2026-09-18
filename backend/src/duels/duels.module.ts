import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { QuizModule } from '../quiz/quiz.module';
import { DuelsController } from './controllers/duels.controller';
import { systemClock } from './live/live-game';
import { LIVE_CLOCK, LiveGamesService } from './live/live-games.service';
import { LiveLobbyService } from './live/live-lobby.service';
import { LiveGateway } from './live/live.gateway';
import { DuelsRepository } from './repositories/duels.repository';
import { DuelsService } from './services/duels.service';

/**
 * Duels module (docs/06-backend/architecture.md §6). Depends on QuizModule
 * because a duel is played through the ordinary engine — scoring, exposure
 * history, XP and statistics stay single implementations. AuthModule checks
 * the token a live duel socket connects with.
 */
@Module({
  imports: [QuizModule, AuthModule],
  controllers: [DuelsController],
  providers: [
    DuelsService,
    DuelsRepository,
    LiveGamesService,
    LiveLobbyService,
    LiveGateway,
    { provide: LIVE_CLOCK, useValue: systemClock },
  ],
  // Exported for JobsModule, which expires unanswered challenges on schedule.
  exports: [DuelsService],
})
export class DuelsModule {}
