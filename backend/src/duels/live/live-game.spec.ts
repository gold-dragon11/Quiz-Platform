import type { QuizQuestionView } from '../../quiz/types/quiz.types';
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

/** A clock that moves only when told to. */
class FakeClock implements LiveClock {
  private time = 1_000_000;
  private tasks: { at: number; task: () => void; live: boolean }[] = [];

  now(): number {
    return this.time;
  }

  schedule(ms: number, task: () => void): () => void {
    const entry = { at: this.time + ms, task, live: true };
    this.tasks.push(entry);
    return () => {
      entry.live = false;
    };
  }

  async advance(ms: number): Promise<void> {
    // Whatever was set off before the clock moves — a question closing
    // because both answered — gets to schedule its next step first.
    await flush();
    const target = this.time + ms;
    for (;;) {
      const due = this.tasks
        .filter((entry) => entry.live && entry.at <= target)
        .sort((a, b) => a.at - b.at)[0];
      if (!due) {
        break;
      }
      due.live = false;
      this.time = due.at;
      due.task();
      await flush();
    }
    this.time = target;
    await flush();
  }
}

const flush = async (): Promise<void> => {
  for (let i = 0; i < 10; i += 1) {
    await Promise.resolve();
  }
};

const question = (id: string): QuizQuestionView =>
  ({ id, type: 'SINGLE_CHOICE' }) as unknown as QuizQuestionView;

const RIGHT = { answerOptionId: 'right' };
const WRONG = { answerOptionId: 'wrong' };

function setup(count = 2, seconds = 10) {
  const clock = new FakeClock();
  const ids = Array.from({ length: count }, (_, i) => `q${i}`);
  const player = (userId: string): LivePlayer => ({
    userId,
    sessionId: `s-${userId}`,
    displayName: userId,
    username: userId,
    questions: ids.map(question),
  });
  const finished: LiveFinish[] = [];
  const recorded: { userId: string; seconds: number }[] = [];
  const port: LiveGamePort = {
    recordAnswer: (one, _questionId, answer, secs) => {
      if ('broken' in answer) {
        return Promise.reject(new Error('bad shape'));
      }
      recorded.push({ userId: one.userId, seconds: secs });
      return Promise.resolve(answer.answerOptionId === 'right');
    },
    correctAnswer: () => Promise.resolve({ optionId: 'right' }),
    finish: (result) => {
      finished.push(result);
      return Promise.resolve();
    },
    publish: () => undefined,
    isConnected: () => true,
    error: (error) => {
      throw error;
    },
  };
  const game = new LiveGame(
    'duel-1',
    { id: 'sub', name: 'Історія' },
    seconds,
    [player('ann'), player('ben')],
    port,
    clock,
  );
  return { game, clock, finished, recorded };
}

describe('LiveGame', () => {
  it('counts down, then opens the first question with its deadline', async () => {
    const { game, clock } = setup();
    game.start();
    expect(game.viewFor('ann').phase).toBe('countdown');
    expect(game.viewFor('ann').question).toBeNull();

    await clock.advance(COUNTDOWN_MS);
    const view = game.viewFor('ann');
    expect(view.phase).toBe('question');
    expect(view.question?.id).toBe('q0');
    expect(view.deadline).toBe(clock.now() + 10_000);
  });

  it('keeps the first answer and turns away a second one', async () => {
    const { game, clock } = setup();
    game.start();
    await clock.advance(COUNTDOWN_MS + 2000);

    await expect(game.submit('ann', 'q0', WRONG)).resolves.toEqual({
      accepted: true,
    });
    await expect(game.submit('ann', 'q0', RIGHT)).resolves.toEqual({
      accepted: false,
      reason: 'ALREADY_ANSWERED',
    });
    expect(game.viewFor('ann').myAnswer).toEqual(WRONG);
  });

  it('shows the opponent only that an answer was given, not whether it was right', async () => {
    const { game, clock } = setup();
    game.start();
    await clock.advance(COUNTDOWN_MS);
    await game.submit('ann', 'q0', RIGHT);

    const bens = game.viewFor('ben');
    expect(bens.opponent.answered).toBe(true);
    expect(bens.opponent.score).toBe(0);
    expect(bens.reveal).toBeNull();
  });

  it('reveals at once when both have answered', async () => {
    const { game, clock } = setup();
    game.start();
    await clock.advance(COUNTDOWN_MS + 1000);
    await game.submit('ann', 'q0', RIGHT);
    await game.submit('ben', 'q0', WRONG);
    await clock.advance(0);

    const view = game.viewFor('ann');
    expect(view.phase).toBe('reveal');
    expect(view.reveal?.correctAnswer).toEqual({ optionId: 'right' });
    expect(view.reveal?.mine?.isCorrect).toBe(true);
    expect(view.reveal?.theirs?.isCorrect).toBe(false);
    expect(view.me.score).toBe(1);
  });

  it('takes an answer a moment past the deadline, not after the grace', async () => {
    const { game, clock } = setup();
    game.start();
    await clock.advance(COUNTDOWN_MS + 10_000 + NETWORK_GRACE_MS / 2);
    await expect(game.submit('ann', 'q0', RIGHT)).resolves.toEqual({
      accepted: true,
    });

    await clock.advance(NETWORK_GRACE_MS);
    await expect(game.submit('ben', 'q0', RIGHT)).resolves.toEqual({
      accepted: false,
      reason: 'NOT_OPEN',
    });
  });

  it('refuses an answer to a question that is not the open one', async () => {
    const { game, clock } = setup();
    game.start();
    await clock.advance(COUNTDOWN_MS);
    await expect(game.submit('ann', 'q1', RIGHT)).resolves.toEqual({
      accepted: false,
      reason: 'WRONG_QUESTION',
    });
  });

  it('lets a player try again after an answer of the wrong shape', async () => {
    const { game, clock } = setup();
    game.start();
    await clock.advance(COUNTDOWN_MS);
    await expect(game.submit('ann', 'q0', { broken: true })).resolves.toEqual({
      accepted: false,
      reason: 'INVALID',
    });
    await expect(game.submit('ann', 'q0', RIGHT)).resolves.toEqual({
      accepted: true,
    });
  });

  it('plays to the end: more right answers wins, time recorded by the server', async () => {
    const { game, clock, finished, recorded } = setup();
    game.start();
    await clock.advance(COUNTDOWN_MS + 4000);
    await game.submit('ann', 'q0', RIGHT);
    // Ben never answers the first question: it closes on the clock, and the
    // second opens right after the reveal.
    await clock.advance(6000 + NETWORK_GRACE_MS + REVEAL_MS);
    expect(game.viewFor('ben').question?.id).toBe('q1');
    await game.submit('ann', 'q1', WRONG);
    await game.submit('ben', 'q1', RIGHT);
    await clock.advance(REVEAL_MS);

    expect(recorded[0]).toEqual({ userId: 'ann', seconds: 4 });
    expect(finished).toHaveLength(1);
    expect(finished[0].players).toEqual([
      { userId: 'ann', sessionId: 's-ann', correct: 1, durationSeconds: 4 },
      // 10 s for the unanswered question, ~0 for the one answered at once.
      { userId: 'ben', sessionId: 's-ben', correct: 1, durationSeconds: 10 },
    ]);
    expect(game.viewFor('ann').result).toEqual({
      outcome: 'WIN',
      forfeit: null,
      sessionId: 's-ann',
      // Exactly the figures the tie-break compared.
      time: { mine: 4, theirs: 10 },
      questions: [
        { mine: { isCorrect: true, seconds: 4 }, theirs: null },
        {
          mine: { isCorrect: false, seconds: 0 },
          theirs: { isCorrect: true, seconds: 0 },
        },
      ],
    });
    expect(game.viewFor('ben').result?.outcome).toBe('LOSS');
  });

  it('calls it a draw at equal answers and equal time', async () => {
    const { game, clock } = setup(1);
    game.start();
    await clock.advance(COUNTDOWN_MS + 3000);
    await game.submit('ann', 'q0', RIGHT);
    await game.submit('ben', 'q0', RIGHT);
    await clock.advance(REVEAL_MS);

    expect(game.viewFor('ann').result?.outcome).toBe('DRAW');
  });

  it('ends at once on a surrender, the other player winning whatever the score', async () => {
    const { game, clock, finished } = setup();
    game.start();
    await clock.advance(COUNTDOWN_MS);
    await game.submit('ann', 'q0', RIGHT);
    game.forfeit('ann');
    await clock.advance(0);

    expect(finished[0].forfeitedById).toBe('ann');
    expect(game.viewFor('ann').result).toMatchObject({
      outcome: 'LOSS',
      forfeit: 'ME',
    });
    expect(game.viewFor('ben').result).toMatchObject({
      outcome: 'WIN',
      forfeit: 'OPPONENT',
    });
    // No more questions open after the game is over.
    await clock.advance(60_000);
    expect(finished).toHaveLength(1);
  });
});
