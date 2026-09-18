import type { DuelMode, DuelStatus } from '@/shared/types/enums';

/**
 * Duel types, mirrored from the backend (`src/duels/types/duel.types.ts`) —
 * never redesigned here.
 */

/** One side of a duel, as the other side is allowed to see it. */
export interface DuelPlayer {
  id: string;
  displayName: string | null;
  username: string | null;
  /** Null until both players finish — a score in progress is never shown. */
  score: {
    correctAnswers: number;
    totalQuestions: number;
    accuracy: number;
    durationSeconds: number | null;
  } | null;
  finished: boolean;
}

export type DuelOutcome = 'CHALLENGER' | 'OPPONENT' | 'DRAW';

/** A duel as either player sees it. */
export interface DuelView {
  id: string;
  mode: DuelMode;
  status: DuelStatus;
  subject: { id: string; name: string };
  topic: { id: string; name: string } | null;
  questionCount: number;
  /** Live only: the clock each question was on. */
  secondsPerQuestion: number | null;
  /** Live only: the player who surrendered. */
  forfeitedById: string | null;
  challenger: DuelPlayer;
  opponent: DuelPlayer;
  /** Set only once both have finished. */
  winner: DuelOutcome | null;
  /** ISO timestamps. */
  expiresAt: string;
  createdAt: string;
  completedAt: string | null;
  /** The viewer's own session, when they have started one. */
  mySessionId: string | null;
}

/** Body of POST /duels. */
export interface CreateDuelPayload {
  opponentUsername: string;
  subjectId: string;
  topicId?: string;
  /** 3–20; the backend's own default keeps a duel a round, not a sitting. */
  questionCount?: number;
}
