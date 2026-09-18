import { ConflictException, Inject, Injectable, Logger } from '@nestjs/common';
import { AccountStatus } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { isUUID } from 'class-validator';
import { PrismaService } from '../../prisma/prisma.service';
import { DuelsRepository } from '../repositories/duels.repository';
import type { LiveClock } from './live-game';
import { LiveError } from './live-error';
import {
  LIVE_CLOCK,
  type LiveGameSettings,
  LiveGamesService,
} from './live-games.service';
import { isLiveCount, isLiveSeconds } from './question-fit.util';

/** How long a challenge by username waits for an answer. */
export const INVITE_LIFETIME_MS = 30_000;
/** How long a player waits in the queue before being told nobody came. */
export const QUEUE_PATIENCE_MS = 90_000;

/** What the socket needs to reach people; set by the gateway. */
export interface LobbyOutlet {
  toUser(userId: string, event: string, payload: unknown): void;
  toEveryone(event: string, payload: unknown): void;
}

interface Waiting {
  userId: string;
  key: string;
  settings: LiveGameSettings;
  since: number;
  cancel: () => void;
}

interface Invite {
  id: string;
  fromId: string;
  toId: string;
  settings: LiveGameSettings;
  expiresAt: number;
  cancel: () => void;
}

/** Who is waiting for what, without saying who. */
export interface LobbyState {
  waiting: {
    subjectId: string;
    seconds: number;
    count: number;
    players: number;
  }[];
}

export type InviteClosedReason =
  'ACCEPTED' | 'DECLINED' | 'EXPIRED' | 'CANCELLED' | 'FAILED';

/**
 * Finding an opponent for a live duel (docs/02-domain/duel.md §5.1).
 *
 * Who is online, challenges by username, and the queue for a random opponent
 * — all in memory, like the games (decision 31). A player is in at most one of
 * these at a time, and not while they have a game or an unfinished test.
 */
@Injectable()
export class LiveLobbyService {
  private readonly logger = new Logger(LiveLobbyService.name);
  private readonly presence = new Map<string, number>();
  private readonly queue: Waiting[] = [];
  private readonly invites = new Map<string, Invite>();
  /** Between «agreed» and the game existing: busy, but in neither list. */
  private readonly starting = new Set<string>();
  private outlet: LobbyOutlet = {
    toUser: () => undefined,
    toEveryone: () => undefined,
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly duelsRepository: DuelsRepository,
    private readonly games: LiveGamesService,
    @Inject(LIVE_CLOCK) private readonly clock: LiveClock,
  ) {}

  connect(outlet: LobbyOutlet): void {
    this.outlet = outlet;
  }

  // -------------------------------------------------------------- presence

  arrived(userId: string): void {
    this.presence.set(userId, (this.presence.get(userId) ?? 0) + 1);
  }

  /** The last tab closing takes the player out of the queue and any challenge. */
  left(userId: string): void {
    const remaining = (this.presence.get(userId) ?? 1) - 1;
    if (remaining > 0) {
      this.presence.set(userId, remaining);
      return;
    }
    this.presence.delete(userId);
    this.leaveQueue(userId);
    for (const invite of [...this.invites.values()]) {
      if (invite.fromId === userId || invite.toId === userId) {
        this.closeInvite(invite, 'CANCELLED');
      }
    }
  }

  isOnline(userId: string): boolean {
    return this.presence.has(userId);
  }

  lobbyState(): LobbyState {
    const groups = new Map<string, LobbyState['waiting'][number]>();
    for (const waiting of this.queue) {
      const group = groups.get(waiting.key) ?? {
        subjectId: waiting.settings.subjectId,
        seconds: waiting.settings.seconds,
        count: waiting.settings.count,
        players: 0,
      };
      group.players += 1;
      groups.set(waiting.key, group);
    }
    return { waiting: [...groups.values()] };
  }

  // ----------------------------------------------------------------- queue

  /**
   * Joins the queue for a random opponent — or, when somebody is already
   * waiting for the same subject, time and count, starts the game with them.
   */
  async joinQueue(
    userId: string,
    input: unknown,
  ): Promise<{ state: 'waiting' | 'matched' }> {
    const settings = parseSettings(input, false);
    this.assertIdle(userId);
    await this.games.assertFree(userId);
    // The subject has to be able to fill a game at all before anyone waits.
    await this.games.draw(settings, [userId]);
    this.assertIdle(userId); // anything could have happened while that ran

    const key = queueKey(settings);
    const partner = this.queue.find(
      (waiting) => waiting.key === key && waiting.userId !== userId,
    );

    if (!partner) {
      const cancel = this.clock.schedule(QUEUE_PATIENCE_MS, () => {
        this.removeFromQueue(userId);
        this.outlet.toUser(userId, 'live:queue', { state: 'timeout' });
      });
      this.queue.push({
        userId,
        key,
        settings,
        since: this.clock.now(),
        cancel,
      });
      this.outlet.toUser(userId, 'live:queue', {
        state: 'waiting',
        since: this.clock.now(),
        serverNow: this.clock.now(),
        ...settings,
      });
      this.broadcastLobby();
      return { state: 'waiting' };
    }

    // The one who waited longer challenges.
    this.removeFromQueue(partner.userId);
    await this.startGame(partner.userId, userId, settings, (message) => {
      for (const one of [partner.userId, userId]) {
        this.outlet.toUser(one, 'live:queue', { state: 'failed', message });
      }
    });
    return { state: 'matched' };
  }

  leaveQueue(userId: string): void {
    if (this.removeFromQueue(userId)) {
      this.outlet.toUser(userId, 'live:queue', { state: 'left' });
    }
  }

  // --------------------------------------------------------------- invites

  /** Challenges somebody who is online right now, by username. */
  async sendInvite(
    userId: string,
    input: unknown,
  ): Promise<{ inviteId: string; expiresAt: number }> {
    const settings = parseSettings(input, true);
    const username = (input as { username?: unknown }).username;
    if (typeof username !== 'string' || username.trim() === '') {
      throw new LiveError('INVALID');
    }
    this.assertIdle(userId);
    await this.games.assertFree(userId);

    const target = await this.duelsRepository.findUserByUsername(
      username.trim(),
    );
    // A demo account is never a live opponent, and is answered as unknown.
    if (
      !target ||
      target.accountStatus !== AccountStatus.ACTIVE ||
      target.isDemo
    ) {
      throw new LiveError('NOT_FOUND');
    }
    if (target.id === userId) {
      throw new LiveError('SELF');
    }
    if (!this.isOnline(target.id)) {
      throw new LiveError('OFFLINE');
    }
    if (this.isBusy(target.id)) {
      throw new LiveError('OPPONENT_BUSY');
    }
    try {
      await this.games.assertFree(target.id);
    } catch {
      throw new LiveError('OPPONENT_BUSY');
    }
    await this.games.draw(settings, [userId, target.id]);
    this.assertIdle(userId);
    if (this.isBusy(target.id)) {
      throw new LiveError('OPPONENT_BUSY');
    }

    const [from, subject, topic] = await Promise.all([
      this.prisma.profile.findUnique({
        where: { userId },
        select: { displayName: true, username: true },
      }),
      this.prisma.subject.findUnique({
        where: { id: settings.subjectId },
        select: { id: true, name: true },
      }),
      settings.topicId
        ? this.prisma.topic.findUnique({
            where: { id: settings.topicId },
            select: { id: true, name: true },
          })
        : Promise.resolve(null),
    ]);

    const id = randomUUID();
    const expiresAt = this.clock.now() + INVITE_LIFETIME_MS;
    const invite: Invite = {
      id,
      fromId: userId,
      toId: target.id,
      settings,
      expiresAt,
      cancel: this.clock.schedule(INVITE_LIFETIME_MS, () =>
        this.closeInvite(invite, 'EXPIRED'),
      ),
    };
    this.invites.set(id, invite);

    this.outlet.toUser(target.id, 'live:invite:incoming', {
      inviteId: id,
      from: {
        displayName: from?.displayName ?? null,
        username: from?.username ?? null,
      },
      subject,
      topic,
      seconds: settings.seconds,
      count: settings.count,
      expiresAt,
      serverNow: this.clock.now(),
    });
    return { inviteId: id, expiresAt };
  }

  cancelInvite(userId: string): void {
    for (const invite of [...this.invites.values()]) {
      if (invite.fromId === userId) {
        this.closeInvite(invite, 'CANCELLED');
      }
    }
  }

  async respond(userId: string, input: unknown): Promise<void> {
    const { inviteId, accept } = (input ?? {}) as {
      inviteId?: unknown;
      accept?: unknown;
    };
    const invite =
      typeof inviteId === 'string' ? this.invites.get(inviteId) : undefined;
    if (!invite || invite.toId !== userId || typeof accept !== 'boolean') {
      throw new LiveError('GONE');
    }
    if (!accept) {
      this.closeInvite(invite, 'DECLINED');
      return;
    }

    this.closeInvite(invite, 'ACCEPTED');
    await this.startGame(
      invite.fromId,
      invite.toId,
      invite.settings,
      (message) => {
        for (const one of [invite.fromId, invite.toId]) {
          this.outlet.toUser(one, 'live:invite:closed', {
            inviteId: invite.id,
            reason: 'FAILED',
            message,
          });
        }
      },
    );
  }

  // ---------------------------------------------------------------- shared

  private async startGame(
    challengerId: string,
    opponentId: string,
    settings: LiveGameSettings,
    onFailure: (message: string) => void,
  ): Promise<void> {
    this.starting.add(challengerId);
    this.starting.add(opponentId);
    this.broadcastLobby();
    try {
      await this.games.start(challengerId, opponentId, settings);
    } catch (error) {
      if (error instanceof LiveError) {
        onFailure(error.message);
      } else if (error instanceof ConflictException) {
        onFailure(new LiveError('ACTIVE_SESSION').message);
      } else {
        this.logger.error(
          'Could not start a live duel',
          error instanceof Error ? error.stack : String(error),
        );
        onFailure('Не вдалося почати гру. Спробуйте ще раз.');
      }
    } finally {
      this.starting.delete(challengerId);
      this.starting.delete(opponentId);
    }
  }

  private closeInvite(invite: Invite, reason: InviteClosedReason): void {
    if (!this.invites.delete(invite.id)) {
      return;
    }
    invite.cancel();
    for (const one of [invite.fromId, invite.toId]) {
      this.outlet.toUser(one, 'live:invite:closed', {
        inviteId: invite.id,
        reason,
      });
    }
  }

  private removeFromQueue(userId: string): boolean {
    const index = this.queue.findIndex((waiting) => waiting.userId === userId);
    if (index === -1) {
      return false;
    }
    const [waiting] = this.queue.splice(index, 1);
    waiting.cancel();
    this.broadcastLobby();
    return true;
  }

  private broadcastLobby(): void {
    this.outlet.toEveryone('live:lobby', this.lobbyState());
  }

  private isBusy(userId: string): boolean {
    return (
      this.starting.has(userId) ||
      this.games.gameOf(userId) !== undefined ||
      this.queue.some((waiting) => waiting.userId === userId) ||
      [...this.invites.values()].some(
        (invite) => invite.fromId === userId || invite.toId === userId,
      )
    );
  }

  private assertIdle(userId: string): void {
    if (this.isBusy(userId)) {
      throw new LiveError('BUSY');
    }
  }
}

function queueKey(settings: LiveGameSettings): string {
  return `${settings.subjectId}:${settings.seconds}:${settings.count}`;
}

/**
 * Settings from the client, checked by hand: socket payloads do not pass the
 * HTTP validation pipe. A random match never has a topic (decision 34).
 */
function parseSettings(input: unknown, allowTopic: boolean): LiveGameSettings {
  const raw = (input ?? {}) as Record<string, unknown>;
  const { subjectId, seconds, count } = raw;
  const topicId = raw.topicId ?? null;

  if (
    typeof subjectId !== 'string' ||
    !isUUID(subjectId) ||
    typeof seconds !== 'number' ||
    !isLiveSeconds(seconds) ||
    typeof count !== 'number' ||
    !isLiveCount(count) ||
    (topicId !== null &&
      (!allowTopic || typeof topicId !== 'string' || !isUUID(topicId)))
  ) {
    throw new LiveError('INVALID');
  }
  return { subjectId, topicId, seconds, count };
}
