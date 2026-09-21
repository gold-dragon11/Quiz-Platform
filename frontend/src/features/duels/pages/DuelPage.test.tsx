import { HttpResponse, http } from 'msw';
import { afterEach, describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { api, server } from '@/test/server';
import { renderScreen } from '@/test/render';
import { useAuthStore } from '@/stores/auth-store';
import { DuelPage } from './DuelPage';

/**
 * One duel, from the side of whoever is looking at it. The screen has to
 * answer whose turn it is before anything else — and it must never show a
 * score that has not been earned: seeing what you have to beat before you
 * play is a target, not a duel.
 */

const ME = 'u-me';
const THEM = 'u-them';

const player = (id: string, name: string, score: { correct: number } | null) => ({
  id,
  displayName: name,
  username: name.toLowerCase(),
  finished: score !== null,
  score: score
    ? { correctAnswers: score.correct, totalQuestions: 5, accuracy: score.correct * 20, durationSeconds: 120 }
    : null,
});

const duel = (over: Partial<Record<string, unknown>> = {}) => ({
  id: 'd-1',
  mode: 'ASYNC',
  status: 'ACCEPTED',
  subject: { id: 'sub-1', name: 'Історія України' },
  topic: null,
  questionCount: 5,
  secondsPerQuestion: null,
  forfeitedById: null,
  challenger: player(THEM, 'Андрій', null),
  opponent: player(ME, 'Олена', null),
  winner: null,
  expiresAt: '2026-10-01T10:00:00.000Z',
  createdAt: '2026-09-20T10:00:00.000Z',
  completedAt: null,
  mySessionId: null,
  ...over,
});

const me = http.get(api('/auth/me'), () =>
  HttpResponse.json({
    id: ME,
    email: 'olena@example.com',
    role: 'USER',
    accountStatus: 'ACTIVE',
    isDemo: false,
    profile: { displayName: 'Олена', username: 'olena' },
    avatar: null,
  }),
);
const noActiveSession = http.get(api('/quiz/active'), () => HttpResponse.json({ session: null }));
const subjects = http.get(api('/subjects'), () => HttpResponse.json([]));

const open = () =>
  renderScreen(<DuelPage />, {
    path: '/duels/:duelId',
    route: '/duels/d-1',
    also: [
      { path: '/quiz/:sessionId', element: <p>Папір відкрито</p> },
      { path: '/duels/live/:duelId', element: <p>Жива гра</p> },
    ],
  });

describe('DuelPage', () => {
  const signedIn = () => useAuthStore.setState({ status: 'authenticated', accessToken: 'token' });
  afterEach(() => useAuthStore.setState({ status: 'loading', accessToken: null }));

  it('lets the challenged player accept, and freezes the paper only then', async () => {
    signedIn();
    let accepted = false;
    server.use(
      me,
      noActiveSession,
      subjects,
      http.get(api('/duels/d-1'), () =>
        HttpResponse.json(duel({ status: accepted ? 'ACCEPTED' : 'PENDING' })),
      ),
      http.post(api('/duels/d-1/accept'), () => {
        accepted = true;
        return HttpResponse.json(duel());
      }),
    );
    const { user } = open();

    await user.click(await screen.findByRole('button', { name: 'Прийняти виклик' }));

    expect(await screen.findByRole('button', { name: 'Грати' })).toBeInTheDocument();
  });

  it('declines without playing', async () => {
    signedIn();
    let declined = false;
    server.use(
      me,
      noActiveSession,
      subjects,
      http.get(api('/duels/d-1'), () =>
        HttpResponse.json(duel({ status: declined ? 'DECLINED' : 'PENDING' })),
      ),
      http.post(api('/duels/d-1/decline'), () => {
        declined = true;
        return HttpResponse.json(duel({ status: 'DECLINED' }));
      }),
    );
    const { user } = open();

    await user.click(await screen.findByRole('button', { name: 'Відхилити' }));

    expect(await screen.findByText(/Виклик відхилено/)).toBeInTheDocument();
  });

  it('opens the paper when it is this player’s turn', async () => {
    signedIn();
    server.use(
      me,
      noActiveSession,
      subjects,
      http.get(api('/duels/d-1'), () => HttpResponse.json(duel())),
      http.post(api('/duels/d-1/play'), () => HttpResponse.json({ sessionId: 's-duel', status: 'ACTIVE' })),
    );
    const { user } = open();

    await user.click(await screen.findByRole('button', { name: 'Грати' }));

    expect(await screen.findByText('Папір відкрито')).toBeInTheDocument();
  });

  it('keeps the opponent’s score hidden until both have finished', async () => {
    signedIn();
    server.use(
      me,
      noActiveSession,
      subjects,
      http.get(api('/duels/d-1'), () =>
        HttpResponse.json(
          duel({
            opponent: player(ME, 'Олена', { correct: 4 }),
            challenger: player(THEM, 'Андрій', null),
            mySessionId: 's-duel',
          }),
        ),
      ),
    );
    open();

    expect(await screen.findByText(/Ви своє відіграли/)).toBeInTheDocument();
    expect(screen.queryByText('Виграш')).not.toBeInTheDocument();
  });

  it('sends a live duel back to its own screen instead of the paper', async () => {
    signedIn();
    server.use(
      me,
      noActiveSession,
      subjects,
      http.get(api('/duels/d-1'), () => HttpResponse.json(duel({ mode: 'LIVE', secondsPerQuestion: 20 }))),
    );
    const { user } = open();

    await user.click(await screen.findByRole('button', { name: 'Повернутися до гри' }));

    expect(await screen.findByText('Жива гра')).toBeInTheDocument();
  });
});
