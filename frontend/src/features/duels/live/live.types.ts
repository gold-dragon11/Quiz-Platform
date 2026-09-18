import type { QuizQuestionView, SelectedAnswer } from '@/features/quiz/types/quiz.types';

/**
 * Live duel types, mirrored from the backend (`src/duels/live/live.types.ts`
 * and the socket events in `live.gateway.ts`) — never redesigned here.
 */

export type LivePhase = 'countdown' | 'question' | 'reveal' | 'finished';

export interface LivePlayerView {
  id: string;
  displayName: string | null;
  username: string | null;
  /** Right answers among the questions already revealed. */
  score: number;
  /** Whether they have answered the open question — never whether rightly. */
  answered: boolean;
  connected: boolean;
}

export interface LiveAnswerOutcome {
  isCorrect: boolean;
  seconds: number;
}

export interface LiveRevealView {
  correctAnswer: Record<string, unknown>;
  mine: LiveAnswerOutcome | null;
  theirs: LiveAnswerOutcome | null;
}

export type LiveResultOutcome = 'WIN' | 'LOSS' | 'DRAW';

/** The whole game as this player sees it; sent after every change. */
export interface LiveGameView {
  duelId: string;
  phase: LivePhase;
  subject: { id: string; name: string };
  secondsPerQuestion: number;
  questionCount: number;
  index: number;
  /** Server epoch milliseconds; correct with the clock offset before use. */
  deadline: number | null;
  serverNow: number;
  question: QuizQuestionView | null;
  myAnswer: SelectedAnswer | null;
  me: LivePlayerView;
  opponent: LivePlayerView;
  reveal: LiveRevealView | null;
  result: {
    outcome: LiveResultOutcome;
    forfeit: 'ME' | 'OPPONENT' | null;
    sessionId: string;
    /** Whole seconds spent answering — the figures the tie-break compared. */
    time: { mine: number; theirs: number };
    questions: { mine: LiveAnswerOutcome | null; theirs: LiveAnswerOutcome | null }[];
  } | null;
}

export type LiveErrorCode =
  | 'INVALID'
  | 'NOT_FOUND'
  | 'SELF'
  | 'OFFLINE'
  | 'BUSY'
  | 'OPPONENT_BUSY'
  | 'ACTIVE_SESSION'
  | 'NOT_ENOUGH_QUESTIONS'
  | 'DEMO'
  | 'NOT_LEARNER'
  | 'GONE';

export type LiveAck<T extends object = object> =
  ({ ok: true } & T) | { ok: false; code: LiveErrorCode; message: string };

export type LiveAnswerAck =
  | { accepted: true }
  | {
      accepted: false;
      reason: 'NOT_OPEN' | 'WRONG_QUESTION' | 'ALREADY_ANSWERED' | 'TOO_LATE' | 'INVALID';
    };

export interface LiveSeconds {
  seconds: number;
  available: number;
}

/** GET /duels/live/availability */
export interface LiveAvailability {
  subjectId: string;
  topicId: string | null;
  options: LiveSeconds[];
}

export interface LiveSettings {
  subjectId: string;
  seconds: number;
  count: number;
}

/** Who is waiting in the queue for what — never who. */
export interface LobbyState {
  waiting: { subjectId: string; seconds: number; count: number; players: number }[];
}

export type QueueEvent =
  | ({ state: 'waiting'; since: number; serverNow: number } & LiveSettings & { topicId: null })
  | { state: 'timeout' }
  | { state: 'left' }
  | { state: 'failed'; message: string };

export interface IncomingInvite {
  inviteId: string;
  from: { displayName: string | null; username: string | null };
  subject: { id: string; name: string } | null;
  topic: { id: string; name: string } | null;
  seconds: number;
  count: number;
  expiresAt: number;
  serverNow: number;
}

export interface InviteClosed {
  inviteId: string;
  reason: 'ACCEPTED' | 'DECLINED' | 'EXPIRED' | 'CANCELLED' | 'FAILED';
  message?: string;
}

/** The times and counts a live game allows (backend `question-fit.util.ts`). */
export const LIVE_SECONDS = [10, 15, 20, 30, 45, 60] as const;
export const LIVE_COUNTS = [5, 10, 15, 20] as const;
