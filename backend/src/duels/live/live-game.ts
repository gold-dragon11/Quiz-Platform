import type { QuizQuestionView } from '../../quiz/types/quiz.types';
import type {
  LiveAnswerAck,
  LiveAnswerOutcome,
  LiveGameView,
  LivePhase,
  LivePlayerView,
  LiveResultOutcome,
} from './live.types';

/** Before the first question: long enough to see who the opponent is. */
export const COUNTDOWN_MS = 3000;
/** The key on screen before the next question opens. */
export const REVEAL_MS = 3000;
/** An answer sent just before the deadline may arrive just after it. */
export const NETWORK_GRACE_MS = 1000;

/** Time, made replaceable so a game can be played in a test without waiting. */
export interface LiveClock {
  now(): number;
  /** Runs `task` after `ms`; returns a cancel function. */
  schedule(ms: number, task: () => void): () => void;
}

export const systemClock: LiveClock = {
  now: () => Date.now(),
  schedule: (ms, task) => {
    const handle = setTimeout(task, ms);
    return () => clearTimeout(handle);
  },
};

export interface LivePlayer {
  userId: string;
  sessionId: string;
  displayName: string | null;
  username: string | null;
  /** The paper as dealt for this player's session; the same ids, in order. */
  questions: QuizQuestionView[];
}

/** How a finished game went, for whoever writes it down. */
export interface LiveFinish {
  duelId: string;
  forfeitedById: string | null;
  players: {
    userId: string;
    sessionId: string;
    correct: number;
    /** Time spent answering, an unanswered question counting in full. */
    durationSeconds: number;
  }[];
}

/** Everything a game needs from outside itself. */
export interface LiveGamePort {
  /** Stores an accepted answer; resolves to whether it was right. */
  recordAnswer(
    player: LivePlayer,
    questionId: string,
    answer: Record<string, unknown>,
    seconds: number,
  ): Promise<boolean>;
  correctAnswer(
    player: LivePlayer,
    questionId: string,
  ): Promise<Record<string, unknown>>;
  finish(result: LiveFinish): Promise<void>;
  /** Called after every change; sends each player their view. */
  publish(game: LiveGame): void;
  isConnected(userId: string): boolean;
  error(error: unknown): void;
}

interface Answer {
  value: Record<string, unknown>;
  seconds: number;
  /** Null while the engine is still judging it. */
  isCorrect: boolean | null;
  judged: Promise<void>;
}

/**
 * One live duel, from the countdown to the result (docs/02-domain/duel.md §5.3).
 *
 * The server's clock is the only one: every phase has an absolute deadline,
 * set here and sent to both players. An answer counts once, the first one, and
 * only for the open question before its deadline plus a second for the
 * network. Everything is kept in memory; every accepted answer is written
 * through the quiz engine as it arrives, so the database never lags the game.
 */
export class LiveGame {
  private phase: LivePhase = 'countdown';
  private index = 0;
  private deadline: number | null = null;
  private openedAt = 0;
  /** Set the moment a question starts closing, so it closes once. */
  private closing = false;
  private cancelTimer: (() => void) | null = null;
  private forfeitedById: string | null = null;
  private correctAnswer: Record<string, unknown> | null = null;
  private outcome: Map<string, LiveResultOutcome> | null = null;
  /** Whole seconds per player, as the tie-break saw them. */
  private durations = new Map<string, number>();
  /** answers[userId][questionIndex] */
  private readonly answers = new Map<string, Map<number, Answer>>();

  constructor(
    readonly duelId: string,
    readonly subject: { id: string; name: string },
    readonly secondsPerQuestion: number,
    readonly players: [LivePlayer, LivePlayer],
    private readonly port: LiveGamePort,
    private readonly clock: LiveClock = systemClock,
  ) {
    for (const player of players) {
      this.answers.set(player.userId, new Map());
    }
  }

  get questionCount(): number {
    return this.players[0].questions.length;
  }

  get isFinished(): boolean {
    return this.phase === 'finished';
  }

  hasPlayer(userId: string): boolean {
    return this.players.some((player) => player.userId === userId);
  }

  start(): void {
    this.phase = 'countdown';
    this.deadline = this.clock.now() + COUNTDOWN_MS;
    this.cancelTimer = this.clock.schedule(COUNTDOWN_MS, () =>
      this.openQuestion(0),
    );
    this.port.publish(this);
  }

  async submit(
    userId: string,
    questionId: string,
    value: Record<string, unknown>,
  ): Promise<LiveAnswerAck> {
    const player = this.player(userId);
    const now = this.clock.now();

    if (this.phase !== 'question' || this.closing || this.deadline === null) {
      return { accepted: false, reason: 'NOT_OPEN' };
    }
    if (player.questions[this.index]?.id !== questionId) {
      return { accepted: false, reason: 'WRONG_QUESTION' };
    }
    const mine = this.answers.get(userId)!;
    if (mine.has(this.index)) {
      return { accepted: false, reason: 'ALREADY_ANSWERED' };
    }
    if (now > this.deadline + NETWORK_GRACE_MS) {
      return { accepted: false, reason: 'TOO_LATE' };
    }

    // Taken before anything is awaited: a second answer racing the first is
    // turned away rather than both being stored.
    const index = this.index;
    const seconds = Math.min(
      this.secondsPerQuestion,
      Math.max(0, (now - this.openedAt) / 1000),
    );
    let settle!: (accepted: boolean) => void;
    const settled = new Promise<boolean>((resolve) => (settle = resolve));
    const answer: Answer = {
      value,
      seconds,
      isCorrect: null,
      judged: settled.then(() => undefined),
    };
    mine.set(index, answer);

    try {
      answer.isCorrect = await this.port.recordAnswer(
        player,
        questionId,
        value,
        Math.round(seconds),
      );
      settle(true);
    } catch {
      // A shape this question does not take. Not an answer, so the player
      // may still give one.
      mine.delete(index);
      settle(false);
      return { accepted: false, reason: 'INVALID' };
    }

    this.port.publish(this);
    if (
      index === this.index &&
      this.players.every((one) => this.answers.get(one.userId)!.has(index))
    ) {
      void this.closeQuestion(index).catch((error) => this.port.error(error));
    }
    return { accepted: true };
  }

  /** The player gives up; the other wins whatever the score. */
  forfeit(userId: string): void {
    if (this.phase === 'finished' || this.forfeitedById) {
      return;
    }
    this.player(userId);
    this.forfeitedById = userId;
    this.cancelTimer?.();
    void this.finish().catch((error) => this.port.error(error));
  }

  /** Stops the clock without a result — only for shutting the server down. */
  stop(): void {
    this.cancelTimer?.();
  }

  viewFor(userId: string): LiveGameView {
    const me = this.player(userId);
    const opponent = this.players.find((one) => one.userId !== userId)!;
    const showsQuestion =
      this.phase === 'question' ||
      this.phase === 'reveal' ||
      (this.phase === 'finished' && this.correctAnswer !== null);
    const revealed = this.phase === 'reveal' || this.phase === 'finished';
    const mine = this.answers.get(me.userId)!.get(this.index);
    const theirs = this.answers.get(opponent.userId)!.get(this.index);

    return {
      duelId: this.duelId,
      phase: this.phase,
      subject: this.subject,
      secondsPerQuestion: this.secondsPerQuestion,
      questionCount: this.questionCount,
      index: this.index,
      deadline: this.phase === 'finished' ? null : this.deadline,
      serverNow: this.clock.now(),
      question: showsQuestion ? (me.questions[this.index] ?? null) : null,
      myAnswer: showsQuestion ? (mine?.value ?? null) : null,
      me: this.playerView(me),
      opponent: this.playerView(opponent),
      reveal:
        revealed && this.correctAnswer
          ? {
              correctAnswer: this.correctAnswer,
              mine: outcomeOf(mine),
              theirs: outcomeOf(theirs),
            }
          : null,
      result:
        this.phase === 'finished' && this.outcome
          ? {
              outcome: this.outcome.get(me.userId)!,
              forfeit:
                this.forfeitedById === null
                  ? null
                  : this.forfeitedById === me.userId
                    ? 'ME'
                    : 'OPPONENT',
              sessionId: me.sessionId,
              time: {
                mine: this.durations.get(me.userId) ?? 0,
                theirs: this.durations.get(opponent.userId) ?? 0,
              },
              questions: Array.from(
                { length: this.questionCount },
                (_, index) => ({
                  mine: outcomeOf(this.answers.get(me.userId)!.get(index)),
                  theirs: outcomeOf(
                    this.answers.get(opponent.userId)!.get(index),
                  ),
                }),
              ),
            }
          : null,
    };
  }

  // ---------------------------------------------------------------- phases

  private openQuestion(index: number): void {
    if (this.phase === 'finished') {
      return;
    }
    this.phase = 'question';
    this.index = index;
    this.closing = false;
    this.correctAnswer = null;
    this.openedAt = this.clock.now();
    this.deadline = this.openedAt + this.secondsPerQuestion * 1000;
    this.cancelTimer = this.clock.schedule(
      this.secondsPerQuestion * 1000 + NETWORK_GRACE_MS,
      () =>
        void this.closeQuestion(index).catch((error) => this.port.error(error)),
    );
    this.port.publish(this);
  }

  private async closeQuestion(index: number): Promise<void> {
    if (this.phase !== 'question' || this.index !== index || this.closing) {
      return;
    }
    this.closing = true;
    this.cancelTimer?.();

    await this.judged(index);
    const questionId = this.players[0].questions[index].id;
    this.correctAnswer = await this.port.correctAnswer(
      this.players[0],
      questionId,
    );
    if (this.isFinished) {
      return; // a forfeit landed while the key was loading
    }

    this.phase = 'reveal';
    this.deadline = this.clock.now() + REVEAL_MS;
    const last = index + 1 >= this.questionCount;
    this.cancelTimer = this.clock.schedule(REVEAL_MS, () => {
      if (last) {
        void this.finish().catch((error) => this.port.error(error));
      } else {
        this.openQuestion(index + 1);
      }
    });
    this.port.publish(this);
  }

  private async finish(): Promise<void> {
    if (this.phase === 'finished') {
      return;
    }
    this.phase = 'finished';
    this.cancelTimer?.();
    await this.judged(this.index);

    const totals = this.players.map((player) => {
      const mine = this.answers.get(player.userId)!;
      let correct = 0;
      let seconds = 0;
      for (let index = 0; index < this.questionCount; index += 1) {
        const answer = mine.get(index);
        if (answer?.isCorrect) {
          correct += 1;
        }
        seconds += answer ? answer.seconds : this.secondsPerQuestion;
      }
      return {
        userId: player.userId,
        sessionId: player.sessionId,
        correct,
        // Whole seconds, as stored: the winner read back from the database
        // must be the one announced here.
        durationSeconds: Math.round(seconds),
      };
    });

    this.outcome = decide(totals, this.forfeitedById);
    this.durations = new Map(
      totals.map((one) => [one.userId, one.durationSeconds]),
    );
    await this.port.finish({
      duelId: this.duelId,
      forfeitedById: this.forfeitedById,
      players: totals,
    });
    this.port.publish(this);
  }

  // ---------------------------------------------------------------- helpers

  private async judged(index: number): Promise<void> {
    const pending: Promise<void>[] = [];
    for (const player of this.players) {
      const answer = this.answers.get(player.userId)!.get(index);
      if (answer) {
        pending.push(answer.judged);
      }
    }
    await Promise.all(pending);
  }

  private player(userId: string): LivePlayer {
    const player = this.players.find((one) => one.userId === userId);
    if (!player) {
      throw new Error(`User ${userId} is not in duel ${this.duelId}`);
    }
    return player;
  }

  private playerView(player: LivePlayer): LivePlayerView {
    const mine = this.answers.get(player.userId)!;
    const revealedUpTo =
      this.phase === 'reveal' || this.phase === 'finished'
        ? this.index
        : this.index - 1;
    let score = 0;
    for (const [index, answer] of mine) {
      if (index <= revealedUpTo && answer.isCorrect) {
        score += 1;
      }
    }
    return {
      id: player.userId,
      displayName: player.displayName,
      username: player.username,
      score,
      answered: this.phase === 'question' && mine.has(this.index),
      connected: this.port.isConnected(player.userId),
    };
  }
}

function outcomeOf(answer: Answer | undefined): LiveAnswerOutcome | null {
  if (!answer || answer.isCorrect === null) {
    return null;
  }
  return {
    isCorrect: answer.isCorrect,
    seconds: Math.round(answer.seconds * 10) / 10,
  };
}

/**
 * More right answers wins; at equal, less time; a surrender loses outright —
 * the same rule as asynchronous duels (duel.md §5.4).
 */
function decide(
  totals: { userId: string; correct: number; durationSeconds: number }[],
  forfeitedById: string | null,
): Map<string, LiveResultOutcome> {
  const [first, second] = totals;
  let winner: string | null = null;

  if (forfeitedById) {
    winner = forfeitedById === first.userId ? second.userId : first.userId;
  } else if (first.correct !== second.correct) {
    winner = first.correct > second.correct ? first.userId : second.userId;
  } else if (first.durationSeconds !== second.durationSeconds) {
    winner =
      first.durationSeconds < second.durationSeconds
        ? first.userId
        : second.userId;
  }

  return new Map(
    totals.map(({ userId }) => [
      userId,
      winner === null ? 'DRAW' : winner === userId ? 'WIN' : 'LOSS',
    ]),
  );
}
