import { DuelMode, DuelStatus } from '@prisma/client';

/** One side of a duel, as the other side is allowed to see it. */
export interface DuelPlayer {
  id: string;
  displayName: string | null;
  username: string | null;
  /** Null until that player finishes — a score in progress is not shown. */
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
  /** Live only: set when a player surrendered. */
  forfeitedById: string | null;
  challenger: DuelPlayer;
  opponent: DuelPlayer;
  /** Set only once both have finished. */
  winner: DuelOutcome | null;
  expiresAt: Date;
  createdAt: Date;
  completedAt: Date | null;
  /** The viewer's own session, when they have started one. */
  mySessionId: string | null;
}
