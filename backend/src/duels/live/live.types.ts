import type { QuizQuestionView } from '../../quiz/types/quiz.types';

/** Where a live game is (docs/02-domain/duel.md §5.3). */
export type LivePhase = 'countdown' | 'question' | 'reveal' | 'finished';

/** A player as either side sees them during a game. */
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

/** The moment after a question closes. */
export interface LiveRevealView {
  /** The same shape as the review after a test. */
  correctAnswer: Record<string, unknown>;
  mine: LiveAnswerOutcome | null;
  theirs: LiveAnswerOutcome | null;
}

export interface LiveAnswerOutcome {
  isCorrect: boolean;
  seconds: number;
}

export type LiveResultOutcome = 'WIN' | 'LOSS' | 'DRAW';

/**
 * The whole game as one player sees it. Sent after every change, so a client
 * that has just reconnected needs nothing else to pick the game up.
 */
export interface LiveGameView {
  duelId: string;
  phase: LivePhase;
  subject: { id: string; name: string };
  secondsPerQuestion: number;
  questionCount: number;
  /** 0-based; during the countdown, the question about to open. */
  index: number;
  /** When the current phase ends, in server epoch milliseconds. */
  deadline: number | null;
  /** The server's clock as it sent this, for the client's offset. */
  serverNow: number;
  /** The open (or just revealed) question, dealt for this player. */
  question: QuizQuestionView | null;
  /** This player's answer to that question, once given. */
  myAnswer: Record<string, unknown> | null;
  me: LivePlayerView;
  opponent: LivePlayerView;
  reveal: LiveRevealView | null;
  result: {
    outcome: LiveResultOutcome;
    /** Who surrendered, if anyone. */
    forfeit: 'ME' | 'OPPONENT' | null;
    /** For the review of this player's half. */
    sessionId: string;
    /**
     * Time spent answering, in whole seconds — the same figures the tie-break
     * compared, so the screen can never show a gap the result ignored.
     * An unanswered question counts in full.
     */
    time: { mine: number; theirs: number };
    /** Every question, in order: how each player did, or null for none. */
    questions: {
      mine: LiveAnswerOutcome | null;
      theirs: LiveAnswerOutcome | null;
    }[];
  } | null;
}

/** Why an answer was not taken. */
export type LiveAnswerRejection =
  'NOT_OPEN' | 'WRONG_QUESTION' | 'ALREADY_ANSWERED' | 'TOO_LATE' | 'INVALID';

export type LiveAnswerAck =
  { accepted: true } | { accepted: false; reason: LiveAnswerRejection };
