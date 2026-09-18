import { Logger } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import * as Sentry from '@sentry/nestjs';
import type { Namespace, Socket } from 'socket.io';
import { AccessTokenVerifier } from '../../auth/services/access-token-verifier.service';
import { failure, LiveError, type LiveFailure } from './live-error';
import { LiveGamesService } from './live-games.service';
import { LiveLobbyService } from './live-lobby.service';
import type { LiveAnswerAck } from './live.types';

/** Events one connection may send in a window, before the rest are dropped. */
const EVENT_LIMIT = 30;
const EVENT_WINDOW_MS = 10_000;

interface SocketData {
  userId: string;
  events: number[];
}

type Ack<T extends object = object> = ({ ok: true } & T) | LiveFailure;

const room = (userId: string): string => `user:${userId}`;

/**
 * The live duel socket (docs/02-domain/duel.md §5, decision 22).
 *
 * A signed-in player keeps one connection while the app is open, so a
 * challenge can reach them on any page. The handshake carries the access
 * token; demo accounts are turned away (duel.md §6). Every event is answered
 * by acknowledgement, and state changes arrive as events of their own.
 *
 * The HTTP rate limiter does not run here; each connection has its own limit.
 */
@WebSocketGateway({ namespace: '/live' })
export class LiveGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(LiveGateway.name);

  @WebSocketServer()
  private readonly server!: Namespace;

  constructor(
    private readonly verifier: AccessTokenVerifier,
    private readonly games: LiveGamesService,
    private readonly lobby: LiveLobbyService,
  ) {}

  afterInit(): void {
    this.games.connect({
      sendGame: (userId, game) =>
        this.server.to(room(userId)).emit('live:game', game.viewFor(userId)),
      isConnected: (userId) => this.lobby.isOnline(userId),
    });
    this.lobby.connect({
      toUser: (userId, event, payload) =>
        this.server.to(room(userId)).emit(event, payload),
      toEveryone: (event, payload) => this.server.emit(event, payload),
    });
  }

  async handleConnection(socket: Socket): Promise<void> {
    const auth = socket.handshake.auth as { token?: unknown } | undefined;
    let user: Awaited<ReturnType<AccessTokenVerifier['verify']>> = null;
    try {
      user = await this.verifier.verify(auth?.token);
    } catch (error) {
      this.logger.error(
        'Socket authorization lookup failed',
        error instanceof Error ? error.stack : String(error),
      );
    }

    if (!user) {
      socket.emit('live:refused', { code: 'UNAUTHORIZED' });
      socket.disconnect(true);
      return;
    }
    if (user.isDemo) {
      socket.emit('live:refused', failure(new LiveError('DEMO')));
      socket.disconnect(true);
      return;
    }
    // Duels are for learners, as everywhere else in the app: a teacher's
    // statistics are about their groups (decision 29).
    if (user.role === UserRole.TEACHER) {
      socket.emit('live:refused', failure(new LiveError('NOT_LEARNER')));
      socket.disconnect(true);
      return;
    }

    socket.data = { userId: user.id, events: [] } satisfies SocketData;
    await socket.join(room(user.id));
    const wasOnline = this.lobby.isOnline(user.id);
    this.lobby.arrived(user.id);

    socket.emit('live:ready', { userId: user.id });
    socket.emit('live:lobby', this.lobby.lobbyState());
    if (!wasOnline) {
      this.games.connectionChanged(user.id);
    }
    this.games.resend(user.id);
  }

  handleDisconnect(socket: Socket): void {
    const userId = (socket.data as SocketData | undefined)?.userId;
    if (!userId) {
      return;
    }
    this.lobby.left(userId);
    if (!this.lobby.isOnline(userId)) {
      this.games.connectionChanged(userId);
    }
  }

  // ----------------------------------------------------------------- lobby

  @SubscribeMessage('live:queue:join')
  joinQueue(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: unknown,
  ): Promise<Ack<{ state: string }>> {
    return this.handle(socket, async (userId) => ({
      ok: true,
      ...(await this.lobby.joinQueue(userId, body)),
    }));
  }

  @SubscribeMessage('live:queue:leave')
  leaveQueue(@ConnectedSocket() socket: Socket): Promise<Ack> {
    return this.handle(socket, (userId) => {
      this.lobby.leaveQueue(userId);
      return Promise.resolve({ ok: true });
    });
  }

  @SubscribeMessage('live:invite:send')
  sendInvite(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: unknown,
  ): Promise<Ack<{ inviteId: string; expiresAt: number }>> {
    return this.handle(socket, async (userId) => ({
      ok: true,
      ...(await this.lobby.sendInvite(userId, body)),
    }));
  }

  @SubscribeMessage('live:invite:cancel')
  cancelInvite(@ConnectedSocket() socket: Socket): Promise<Ack> {
    return this.handle(socket, (userId) => {
      this.lobby.cancelInvite(userId);
      return Promise.resolve({ ok: true });
    });
  }

  @SubscribeMessage('live:invite:respond')
  respond(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: unknown,
  ): Promise<Ack> {
    return this.handle(socket, async (userId) => {
      await this.lobby.respond(userId, body);
      return { ok: true };
    });
  }

  // ------------------------------------------------------------------ game

  @SubscribeMessage('live:answer')
  answer(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: unknown,
  ): Promise<Ack<LiveAnswerAck>> {
    return this.handle<LiveAnswerAck>(socket, async (userId) => {
      const game = this.games.gameOf(userId);
      const { questionId, answer } = (body ?? {}) as {
        questionId?: unknown;
        answer?: unknown;
      };
      if (
        !game ||
        typeof questionId !== 'string' ||
        typeof answer !== 'object' ||
        answer === null ||
        Array.isArray(answer)
      ) {
        return { ok: true, accepted: false, reason: 'NOT_OPEN' };
      }
      return {
        ok: true,
        ...(await game.submit(
          userId,
          questionId,
          answer as Record<string, unknown>,
        )),
      };
    });
  }

  @SubscribeMessage('live:forfeit')
  forfeit(@ConnectedSocket() socket: Socket): Promise<Ack> {
    return this.handle(socket, (userId) => {
      this.games.gameOf(userId)?.forfeit(userId);
      return Promise.resolve({ ok: true });
    });
  }

  /** The current game, if any — the client asks after it mounts. */
  @SubscribeMessage('live:sync')
  sync(@ConnectedSocket() socket: Socket): Promise<Ack<{ inGame: boolean }>> {
    return this.handle(socket, (userId) =>
      Promise.resolve({ ok: true, inGame: this.games.resend(userId) }),
    );
  }

  // ---------------------------------------------------------------- shared

  private async handle<T extends object>(
    socket: Socket,
    work: (userId: string) => Promise<Ack<T>>,
  ): Promise<Ack<T>> {
    const data = socket.data as SocketData | undefined;
    if (!data?.userId) {
      return failure(new LiveError('GONE'));
    }
    if (!this.withinLimit(data)) {
      return {
        ok: false,
        code: 'BUSY',
        message: 'Забагато запитів. Зачекайте трохи.',
      };
    }
    try {
      return await work(data.userId);
    } catch (error) {
      if (error instanceof LiveError) {
        return failure(error);
      }
      this.logger.error(
        'Live duel event failed',
        error instanceof Error ? error.stack : String(error),
      );
      Sentry.captureException(error, { tags: { feature: 'live-duel' } });
      return {
        ok: false,
        code: 'GONE',
        message: 'Щось пішло не так. Спробуйте ще раз.',
      };
    }
  }

  private withinLimit(data: SocketData): boolean {
    const now = Date.now();
    data.events = data.events.filter((at) => now - at < EVENT_WINDOW_MS);
    if (data.events.length >= EVENT_LIMIT) {
      return false;
    }
    data.events.push(now);
    return true;
  }
}
