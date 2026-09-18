import { afterEach, describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderScreen } from '@/test/render';
import { useLiveStore } from '@/features/duels/live/live-client';
import type { LiveGameView } from '@/features/duels/live/live.types';
import { LiveDuelPage } from './LiveDuelPage';

const question = {
  id: 'q-1',
  type: 'SINGLE_CHOICE',
  subjectSlug: 'history-of-ukraine',
  title: 'Хто очолював Запорозьку Січ?',
  difficulty: null,
  imageUrl: null,
  passage: null,
  passageOrder: null,
  answerOptions: [
    { id: 'o-1', content: 'полковник', imageUrl: null, order: 0 },
    { id: 'o-2', content: 'кошовий отаман', imageUrl: null, order: 1 },
  ],
} as unknown as LiveGameView['question'];

const player = (id: string, name: string, score: number) => ({
  id,
  displayName: name,
  username: null,
  score,
  answered: false,
  connected: true,
});

const view = (overrides: Partial<LiveGameView>): LiveGameView => ({
  duelId: 'duel-1',
  phase: 'question',
  subject: { id: 's', name: 'Історія України' },
  secondsPerQuestion: 20,
  questionCount: 10,
  index: 2,
  deadline: Date.now() + 15_000,
  serverNow: Date.now(),
  question,
  myAnswer: null,
  me: player('me', 'Олена', 2),
  opponent: player('them', 'Андрій', 1),
  reveal: null,
  result: null,
  ...overrides,
});

const show = (game: LiveGameView) => {
  useLiveStore.setState({ game, connection: 'ready', clockOffset: 0 });
  return renderScreen(<LiveDuelPage />, { path: '/duels/live/:duelId', route: '/duels/live/duel-1' });
};

describe('LiveDuelPage', () => {
  afterEach(() => useLiveStore.setState({ game: null, connection: 'off' }));

  it('shows the open question, the score and the seconds left', () => {
    show(view({}));

    expect(screen.getByText('Хто очолював Запорозьку Січ?')).toBeInTheDocument();
    expect(screen.getByLabelText('Рахунок 2 на 1')).toBeInTheDocument();
    expect(screen.getByText('Питання 3 з 10')).toBeInTheDocument();
    expect(screen.getByRole('timer')).toHaveTextContent(/1[45] с/);
  });

  it('says the opponent has answered without saying how', () => {
    show(view({ opponent: { ...player('them', 'Андрій', 1), answered: true } }));
    expect(screen.getByText('Суперник уже відповів')).toBeInTheDocument();
  });

  it('locks the choice once the answer is in', () => {
    show(view({ myAnswer: { answerOptionId: 'o-2' } }));

    for (const option of screen.getAllByRole('radio')) {
      expect(option).toBeDisabled();
    }
    expect(screen.getByText(/Відповідь прийнято/)).toBeInTheDocument();
  });

  it('reveals the key and how both did', () => {
    show(
      view({
        phase: 'reveal',
        myAnswer: { answerOptionId: 'o-2' },
        reveal: {
          correctAnswer: { optionId: 'o-2' },
          mine: { isCorrect: true, seconds: 4.2 },
          theirs: null,
        },
      }),
    );

    expect(screen.getByText('правильна')).toBeInTheDocument();
    expect(screen.getByText('Ви: правильно, 4,2 с')).toBeInTheDocument();
    expect(screen.getByText('Андрій: без відповіді')).toBeInTheDocument();
  });

  it('announces the result, and a surrender as the reason', () => {
    show(
      view({
        phase: 'finished',
        deadline: null,
        result: { outcome: 'WIN', forfeit: 'OPPONENT', sessionId: 's-me' },
      }),
    );

    expect(screen.getByRole('heading', { name: 'Перемога' })).toBeInTheDocument();
    expect(screen.getByText('Андрій — здача.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Мій розбір' })).toBeInTheDocument();
  });
});
