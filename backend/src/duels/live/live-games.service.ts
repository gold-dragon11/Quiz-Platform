import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { DuelMode, DuelStatus, QuizStatus } from '@prisma/client';
import * as Sentry from '@sentry/nestjs';
import { PrismaService } from '../../prisma/prisma.service';
import { QuizService } from '../../quiz/services/quiz.service';
import { DuelsRepository } from '../repositories/duels.repository';
import {
  COUNTDOWN_MS,
  LiveGame,
  type LiveClock,
  type LiveFinish,
  type LiveGamePort,
  type LivePlayer,
  NETWORK_GRACE_MS,
  REVEAL_MS,
} from './live-game';
import { LiveError } from './live-error';
import {
  fitsLiveTime,
  LIVE_SECONDS,
  type LiveCount,
  type LiveSeconds,
} from './question-fit.util';

export const LIVE_CLOCK = Symbol('LIVE_CLOCK');

/** After the last question could have closed, before the sessions expire. */
const EXPIRY_MARGIN_MS = 60_000;

/** How many questions fit each time, for the set-up screen. */
export interface LiveAvailability {
  subjectId: string;
  topicId: string | null;
  options: { seconds: LiveSeconds; available: number }[];
}

export interface LiveGameSettings {
  subjectId: string;
  topicId: string | null;
  seconds: LiveSeconds;
  count: LiveCount;
}

/** How the socket reaches players; set by the gateway once it is up. */
export interface LiveOutlet {
  sendGame(userId: string, game: LiveGame): void;
  isConnected(userId: string): boolean;
}

/**
 * Running live duels (docs/02-domain/duel.md §5): drawing the paper, writing
 * the duel and both sessions, and keeping each game in memory while it plays
 * (decision 31). The game itself is LiveGame; this is everything around it
 * that touches the database.
 */
@Injectable()
export class LiveGamesService implements OnModuleDestroy {
  private readonly logger = new Logger(LiveGamesService.name);
  private readonly byUser = new Map<string, LiveGame>();
  private outlet: LiveOutlet = {
    sendGame: () => undefined,
    isConnected: () => false,
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly duelsRepository: DuelsRepository,
    private readonly quizService: QuizService,
    @Inject(LIVE_CLOCK) private readonly clock: LiveClock,
  ) {}

  connect(outlet: LiveOutlet): void {
    this.outlet = outlet;
  }

  gameOf(userId: string): LiveGame | undefined {
    return this.byUser.get(userId);
  }

  onModuleDestroy(): void {
    for (const game of this.byUser.values()) {
      game.stop();
    }
  }

  /** For each time, how many questions of the subject or topic fit it. */
  async availability(
    subjectId: string,
    topicId: string | null,
  ): Promise<LiveAvailability> {
    const pool = await this.duelsRepository.findLivePool({
      subjectId,
      topicId,
      userIds: [],
    });
    return {
      subjectId,
      topicId,
      options: LIVE_SECONDS.map((seconds) => ({
        seconds,
        available: pool.filter((question) => fitsLiveTime(question, seconds))
          .length,
      })),
    };
  }

  /** Whether this person may start or join a live game right now. */
  async assertFree(userId: string): Promise<void> {
    if (this.byUser.has(userId)) {
      throw new LiveError('BUSY');
    }
    const { session } = await this.quizService.findActive(userId);
    if (session) {
      throw new LiveError('ACTIVE_SESSION');
    }
  }

  /** The paper for a pair: questions that fit, neither has met lately first. */
  async draw(settings: LiveGameSettings, userIds: string[]): Promise<string[]> {
    const pool = await this.duelsRepository.findLivePool({
      subjectId: settings.subjectId,
      topicId: settings.topicId,
      userIds,
    });
    const fitting = pool
      .filter((question) => fitsLiveTime(question, settings.seconds))
      .map((question) => question.id);
    if (fitting.length < settings.count) {
      throw new LiveError('NOT_ENOUGH_QUESTIONS');
    }
    return fitting.slice(0, settings.count);
  }

  /**
   * Starts a game between two players who have both agreed to it.
   *
   * The duel, its paper and both sessions are written before the countdown
   * begins, each session with an expiry just past the last question — so if
   * the process dies mid-game, the engine still closes both halves and the
   * duel settles (duel.md §5.5).
   */
  async start(
    challengerId: string,
    opponentId: string,
    settings: LiveGameSettings,
  ): Promise<LiveGame> {
    const questionIds = await this.draw(settings, [challengerId, opponentId]);

    const now = this.clock.now();
    const startedAt = new Date(now + COUNTDOWN_MS);
    const expiresAt = new Date(
      startedAt.getTime() +
        settings.count *
          (settings.seconds * 1000 + NETWORK_GRACE_MS + REVEAL_MS) +
        EXPIRY_MARGIN_MS,
    );

    const duel = await this.prisma.$transaction(async (tx) => {
      const created = await tx.duel.create({
        data: {
          challengerId,
          opponentId,
          subjectId: settings.subjectId,
          topicId: settings.topicId,
          mode: DuelMode.LIVE,
          status: DuelStatus.ACCEPTED,
          questionCount: settings.count,
          secondsPerQuestion: settings.seconds,
          acceptedAt: new Date(now),
          startedAt,
          expiresAt,
        },
        select: { id: true, subject: { select: { id: true, name: true } } },
      });
      await this.duelsRepository.setQuestions(tx, created.id, questionIds);
      return created;
    });

    const sessions: string[] = [];
    try {
      for (const userId of [challengerId, opponentId]) {
        const session = await this.quizService.startForDuel(userId, {
          duelId: duel.id,
          subjectId: settings.subjectId,
          topicId: settings.topicId,
          questionIds,
          expiresAt,
        });
        sessions.push(session.sessionId);
      }
    } catch (error) {
      // One of them began a test between agreeing and now. Nothing was
      // played: the half already opened is closed without a result, and the
      // duel is marked as never having happened.
      await this.prisma.$transaction([
        this.prisma.quizSession.updateMany({
          where: { id: { in: sessions } },
          data: { status: QuizStatus.ABANDONED },
        }),
        this.prisma.duel.update({
          where: { id: duel.id },
          data: { status: DuelStatus.EXPIRED },
        }),
      ]);
      throw error;
    }

    const profiles = await this.prisma.profile.findMany({
      where: { userId: { in: [challengerId, opponentId] } },
      select: { userId: true, displayName: true, username: true },
    });
    const players = await Promise.all(
      [challengerId, opponentId].map(
        async (userId, index): Promise<LivePlayer> => {
          const profile = profiles.find((one) => one.userId === userId);
          return {
            userId,
            sessionId: sessions[index],
            displayName: profile?.displayName ?? null,
            username: profile?.username ?? null,
            questions: await this.quizService.liveQuestions(
              userId,
              sessions[index],
            ),
          };
        },
      ),
    );

    const game = new LiveGame(
      duel.id,
      duel.subject,
      settings.seconds,
      [players[0], players[1]],
      this.portFor(),
      this.clock,
    );
    for (const player of players) {
      this.byUser.set(player.userId, game);
    }
    game.start();
    return game;
  }

  /** Re-sends the current state — after a reconnect, or when asked. */
  resend(userId: string): boolean {
    const game = this.byUser.get(userId);
    if (!game) {
      return false;
    }
    this.outlet.sendGame(userId, game);
    return true;
  }

  /** Someone came or went: both players see the other's connection. */
  connectionChanged(userId: string): void {
    const game = this.byUser.get(userId);
    if (game) {
      this.publish(game);
    }
  }

  private publish(game: LiveGame): void {
    for (const player of game.players) {
      this.outlet.sendGame(player.userId, game);
    }
  }

  private portFor(): LiveGamePort {
    return {
      recordAnswer: (player, questionId, answer, seconds) =>
        this.quizService.recordLiveAnswer(player.userId, player.sessionId, {
          questionId,
          selectedAnswer: answer,
          timeSpentSeconds: seconds,
        }),
      correctAnswer: (player, questionId) =>
        this.quizService.liveKey(player.sessionId, questionId),
      finish: (result) => this.finish(result),
      publish: (game) => this.publish(game),
      isConnected: (userId) => this.outlet.isConnected(userId),
      error: (error) => {
        this.logger.error(
          'Live duel failed',
          error instanceof Error ? error.stack : String(error),
        );
        Sentry.captureException(error, { tags: { feature: 'live-duel' } });
      },
    };
  }

  private async finish(result: LiveFinish): Promise<void> {
    for (const player of result.players) {
      if (this.byUser.get(player.userId)?.duelId === result.duelId) {
        this.byUser.delete(player.userId);
      }
    }
    for (const player of result.players) {
      await this.quizService.completeLive(
        player.userId,
        player.sessionId,
        player.durationSeconds,
      );
    }
    await this.prisma.duel.update({
      where: { id: result.duelId },
      data: {
        status: DuelStatus.COMPLETED,
        completedAt: new Date(this.clock.now()),
        forfeitedById: result.forfeitedById,
      },
    });
  }
}
