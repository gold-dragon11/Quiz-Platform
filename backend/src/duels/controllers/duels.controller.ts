import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { QuizSessionMetadata } from '../../quiz/types/quiz.types';
import { CreateDuelDto } from '../dto/create-duel.dto';
import { LiveAvailabilityQueryDto } from '../dto/live-availability-query.dto';
import { LiveAvailability, LiveGamesService } from '../live/live-games.service';
import { DuelsService } from '../services/duels.service';
import { DuelView } from '../types/duel.types';

/**
 * Duels (docs/02-domain/duel.md). The asynchronous kind lives here: both
 * players sit the same frozen paper whenever they like, and the result is a
 * comparison. The live kind is played over the socket (live/live.gateway.ts);
 * over HTTP it only has the availability count and its place in the list.
 *
 * Playing runs through the ordinary quiz routes once a session exists, so a
 * duel ends with the same review — including the explanation for every
 * question. That is the difference between this and a quiz show: you find out
 * why you lost the ones you lost.
 */
@UseGuards(JwtAuthGuard)
@Controller('duels')
export class DuelsController {
  constructor(
    private readonly duelsService: DuelsService,
    private readonly liveGames: LiveGamesService,
  ) {}

  /** POST /api/v1/duels — challenge somebody by username. */
  @Post()
  async challenge(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateDuelDto,
  ): Promise<DuelView> {
    return this.duelsService.challenge(userId, dto);
  }

  /** GET /api/v1/duels — every duel this person is in, newest first. */
  @Get()
  async list(@CurrentUser('id') userId: string): Promise<DuelView[]> {
    return this.duelsService.list(userId);
  }

  /**
   * GET /api/v1/duels/live/availability — for each time a live game allows,
   * how many questions of the subject (or topic) fit it (duel.md §5.2).
   * Declared before `:duelId`, which would otherwise take «live» for an id.
   */
  @Get('live/availability')
  async liveAvailability(
    @Query() query: LiveAvailabilityQueryDto,
  ): Promise<LiveAvailability> {
    return this.liveGames.availability(query.subjectId, query.topicId ?? null);
  }

  /** GET /api/v1/duels/:duelId */
  @Get(':duelId')
  async findOne(
    @CurrentUser('id') userId: string,
    @Param('duelId', ParseUUIDPipe) duelId: string,
  ): Promise<DuelView> {
    return this.duelsService.findOne(userId, duelId);
  }

  /** POST /api/v1/duels/:duelId/accept — freezes the paper for both. */
  @Post(':duelId/accept')
  @HttpCode(HttpStatus.OK)
  async accept(
    @CurrentUser('id') userId: string,
    @Param('duelId', ParseUUIDPipe) duelId: string,
  ): Promise<DuelView> {
    return this.duelsService.accept(userId, duelId);
  }

  /** POST /api/v1/duels/:duelId/decline */
  @Post(':duelId/decline')
  @HttpCode(HttpStatus.OK)
  async decline(
    @CurrentUser('id') userId: string,
    @Param('duelId', ParseUUIDPipe) duelId: string,
  ): Promise<DuelView> {
    return this.duelsService.decline(userId, duelId);
  }

  /**
   * POST /api/v1/duels/:duelId/play — start this player's half, or return the
   * one already in progress. From here the ordinary quiz routes take over.
   */
  @Post(':duelId/play')
  @HttpCode(HttpStatus.OK)
  async play(
    @CurrentUser('id') userId: string,
    @Param('duelId', ParseUUIDPipe) duelId: string,
  ): Promise<QuizSessionMetadata> {
    return this.duelsService.play(userId, duelId);
  }
}
