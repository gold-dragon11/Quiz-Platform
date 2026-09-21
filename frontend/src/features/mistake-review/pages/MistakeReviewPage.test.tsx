import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { api, server } from '@/test/server';
import { renderScreen } from '@/test/render';
import { MistakeReviewPage } from './MistakeReviewPage';

/**
 * The screen answers one question — is there anything to do today — and the
 * answer has two honest shapes. A number with a button beside it, or an empty
 * day that says when the next mistakes come back. Neither may be shown as the
 * other: a learner told «nothing today» while twenty questions are due simply
 * stops returning.
 */

const summary = (over: Partial<Record<'due' | 'scheduled' | 'cleared', number>> = {}) => ({
  due: over.due ?? 0,
  scheduled: over.scheduled ?? 0,
  cleared: over.cleared ?? 0,
  ladder: [
    { days: 1, count: 3 },
    { days: 3, count: 2 },
    { days: 7, count: 0 },
  ],
});

const open = () =>
  renderScreen(<MistakeReviewPage />, {
    path: '/mistake-review',
    route: '/mistake-review',
    also: [{ path: '/quiz/:sessionId', element: <p>Сесія повторення</p> }],
  });

const noActiveSession = http.get(api('/quiz/active'), () => HttpResponse.json({ session: null }));
const subjects = http.get(api('/subjects'), () => HttpResponse.json([]));

describe('MistakeReviewPage', () => {
  it('starts the review and goes into the session', async () => {
    server.use(
      noActiveSession,
      subjects,
      http.get(api('/quiz/mistake-review'), () =>
        HttpResponse.json(summary({ due: 24, scheduled: 36, cleared: 5 })),
      ),
      http.post(api('/quiz/mistake-review/start'), () =>
        HttpResponse.json({ sessionId: 's-review', status: 'ACTIVE' }, { status: 201 }),
      ),
    );
    const { user } = open();

    expect(await screen.findByText('24')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Почати повторення' }));

    expect(await screen.findByText('Сесія повторення')).toBeInTheDocument();
  });

  it('on an empty day says when the rest come back, and offers nothing to press', async () => {
    server.use(
      noActiveSession,
      subjects,
      http.get(api('/quiz/mistake-review'), () => HttpResponse.json(summary({ due: 0, scheduled: 12 }))),
    );
    open();

    expect(await screen.findByText(/Сьогодні вільно/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Почати повторення' })).not.toBeInTheDocument();
  });

  it('tells a learner with a clean ladder that mistakes appear on their own', async () => {
    server.use(
      noActiveSession,
      subjects,
      http.get(api('/quiz/mistake-review'), () => HttpResponse.json(summary())),
    );
    open();

    expect(await screen.findByText(/Помилок на розкладі немає/)).toBeInTheDocument();
  });

  it('says plainly when the ladder cannot be read', async () => {
    server.use(
      noActiveSession,
      subjects,
      http.get(api('/quiz/mistake-review'), () => HttpResponse.json({}, { status: 500 })),
    );
    open();

    expect(await screen.findByText(/Не вдалося завантажити стан повторення/)).toBeInTheDocument();
  });
});
