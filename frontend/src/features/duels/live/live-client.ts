import { io, type Socket } from 'socket.io-client';
import { create } from 'zustand';
import { env } from '@/config/env';
import { refreshSession } from '@/lib/api-client';
import { getAccessToken } from '@/stores/auth-store';
import { toast } from '@/stores/toast-store';
import type {
  IncomingInvite,
  InviteClosed,
  LiveAck,
  LiveAnswerAck,
  LiveGameView,
  LiveSettings,
  LobbyState,
  QueueEvent,
} from '@/features/duels/live/live.types';
import type { SelectedAnswer } from '@/features/quiz/types/quiz.types';

/**
 * The live duel socket and what it has told us (docs/02-domain/duel.md §5).
 *
 * One connection per tab while a learner is signed in, so a challenge reaches
 * them on any page. The server owns the game; this only keeps its latest word
 * — the lobby, the queue, the invites, and the game view it sends after every
 * change — and a way to talk back.
 */

export type LiveConnection = 'off' | 'connecting' | 'ready' | 'refused';

/** An outgoing challenge while it waits for an answer. */
export interface OutgoingInvite {
  inviteId: string;
  username: string;
  expiresAt: number;
}

export interface LiveState {
  connection: LiveConnection;
  /** Server clock minus ours, from the last message that carried it. */
  clockOffset: number;
  lobby: LobbyState;
  queue: QueueEvent | null;
  incoming: IncomingInvite | null;
  outgoing: OutgoingInvite | null;
  game: LiveGameView | null;
}

const INITIAL: LiveState = {
  connection: 'off',
  clockOffset: 0,
  lobby: { waiting: [] },
  queue: null,
  incoming: null,
  outgoing: null,
  game: null,
};

/**
 * How a challenge ended, told to whoever sent it — they may be on another
 * page by then, so it is a toast rather than a line in the form.
 */
const CLOSED_FOR_SENDER: Partial<Record<InviteClosed['reason'], string>> = {
  DECLINED: 'Виклик відхилено.',
  EXPIRED: 'На виклик не відповіли.',
  CANCELLED: 'Суперник пішов із сайту — виклик скасовано.',
};

export const useLiveStore = create<LiveState>(() => INITIAL);

const set = (patch: Partial<LiveState>): void => useLiveStore.setState(patch);

/** Server epoch milliseconds, as our clock reads them now. */
export function serverNow(): number {
  return Date.now() + useLiveStore.getState().clockOffset;
}

let socket: Socket | null = null;
/** One refresh per refusal, so an expired session cannot loop. */
let refreshedAfterRefusal = false;

export function connectLive(): void {
  if (socket) {
    return;
  }
  set({ connection: 'connecting' });

  // Read at every (re)connect, so a token refreshed in the meantime is used.
  socket = io(env.liveUrl, {
    auth: (callback) => callback({ token: getAccessToken() }),
    transports: ['websocket', 'polling'],
  });

  socket.on('live:ready', () => {
    refreshedAfterRefusal = false;
    set({ connection: 'ready' });
  });

  socket.on('live:refused', (body: { code?: string }) => {
    set({ connection: 'refused' });
    // An access token lives fifteen minutes; a socket reconnecting after a
    // dropped network may present a stale one. One refresh, then one retry.
    if (body.code === 'UNAUTHORIZED' && !refreshedAfterRefusal) {
      refreshedAfterRefusal = true;
      refreshSession()
        .then(() => socket?.connect())
        .catch(() => undefined);
    }
  });

  socket.on('disconnect', () => {
    if (useLiveStore.getState().connection !== 'refused') {
      set({ connection: 'connecting' });
    }
  });

  socket.on('live:lobby', (lobby: LobbyState) => set({ lobby }));

  socket.on('live:queue', (event: QueueEvent) => {
    if (event.state === 'waiting') {
      set({ queue: event, clockOffset: event.serverNow - Date.now() });
    } else if (event.state === 'left') {
      set({ queue: null });
    } else {
      set({ queue: event });
    }
  });

  socket.on('live:invite:incoming', (invite: IncomingInvite) =>
    set({ incoming: invite, clockOffset: invite.serverNow - Date.now() }),
  );

  socket.on('live:invite:closed', (closed: InviteClosed) => {
    const state = useLiveStore.getState();
    if (state.incoming?.inviteId === closed.inviteId) {
      set({ incoming: null });
    }
    if (closed.reason === 'FAILED') {
      set({ outgoing: null });
      toast.show(closed.message ?? 'Не вдалося почати гру.', 'error');
      return;
    }
    if (state.outgoing?.inviteId === closed.inviteId) {
      set({ outgoing: null });
      const message = CLOSED_FOR_SENDER[closed.reason];
      if (message) {
        toast.show(message, 'info');
      }
    }
  });

  socket.on('live:game', (game: LiveGameView) =>
    set({
      game,
      clockOffset: game.serverNow - Date.now(),
      // A game begun is the end of any search or challenge that led to it.
      queue: null,
      outgoing: null,
      incoming: null,
    }),
  );
}

export function disconnectLive(): void {
  socket?.disconnect();
  socket = null;
  useLiveStore.setState(INITIAL);
}

const NOT_CONNECTED = {
  ok: false,
  code: 'GONE',
  message: 'Немає з’єднання із сервером. Спробуйте за мить.',
} as const;

async function send<T extends object = object>(event: string, body?: unknown): Promise<LiveAck<T>> {
  if (!socket?.connected) {
    return NOT_CONNECTED;
  }
  try {
    return (await socket.timeout(10_000).emitWithAck(event, body)) as LiveAck<T>;
  } catch {
    return NOT_CONNECTED;
  }
}

export const liveActions = {
  joinQueue: (settings: LiveSettings) => send<{ state: 'waiting' | 'matched' }>('live:queue:join', settings),

  leaveQueue: async () => {
    set({ queue: null });
    return send('live:queue:leave');
  },

  sendInvite: async (username: string, settings: LiveSettings & { topicId?: string }) => {
    const ack = await send<{ inviteId: string; expiresAt: number }>('live:invite:send', {
      username,
      ...settings,
    });
    if (ack.ok) {
      set({ outgoing: { inviteId: ack.inviteId, username, expiresAt: ack.expiresAt } });
    }
    return ack;
  },

  cancelInvite: async () => {
    set({ outgoing: null });
    return send('live:invite:cancel');
  },

  respond: async (inviteId: string, accept: boolean) => {
    set({ incoming: null });
    return send('live:invite:respond', { inviteId, accept });
  },

  answer: (questionId: string, answer: SelectedAnswer) =>
    send<LiveAnswerAck>('live:answer', { questionId, answer }),

  forfeit: () => send('live:forfeit'),

  /** Asks for the current game again; `inGame` says whether there is one. */
  sync: () => send<{ inGame: boolean }>('live:sync'),

  dismissQueue: () => set({ queue: null }),
  /** Leaving a finished game's screen. */
  clearGame: () => set({ game: null }),
};
