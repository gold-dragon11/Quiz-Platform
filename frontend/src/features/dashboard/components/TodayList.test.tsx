import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { api, server } from '@/test/server';
import { renderScreen } from '@/test/render';
import { TodayList } from './TodayList';

const subjects = [
  { id: 'maths', name: 'Математика', slug: 'maths', description: null, icon: null, color: null },
  { id: 'history', name: 'Історія України', slug: 'history', description: null, icon: null, color: null },
];

/** A learner with nothing owed; `needsOnboarding` decides which empty state they see. */
const serve = (needsOnboarding: boolean) => {
  const sent: { study?: unknown; start?: unknown } = {};
  server.use(
    http.get(api('/quiz/active'), () => HttpResponse.json({ session: null })),
    http.get(api('/quiz/mistake-review'), () =>
      HttpResponse.json({ due: 0, scheduled: 0, cleared: 0, ladder: [] }),
    ),
    http.get(api('/assignments'), () => HttpResponse.json([])),
    http.get(api('/duels'), () => HttpResponse.json([])),
    http.get(api('/subjects'), () => HttpResponse.json(subjects)),
    http.get(api('/users/me/study'), () => HttpResponse.json({ subjectIds: [], needsOnboarding })),
    http.put(api('/users/me/study'), async ({ request }) => {
      sent.study = await request.json();
      return HttpResponse.json({
        subjectIds: (sent.study as { subjectIds: string[] }).subjectIds,
        needsOnboarding: false,
      });
    }),
    http.post(api('/quiz/start'), async ({ request }) => {
      sent.start = await request.json();
      return HttpResponse.json({ sessionId: 's-1' }, { status: 201 });
    }),
  );
  return sent;
};

const openToday = () =>
  renderScreen(<TodayList userId="u-1" />, {
    also: [{ path: '/quiz/:sessionId', element: <p>Сесія тесту</p> }],
  });

describe('TodayList — the first screen', () => {
  it('asks a learner without a finished test where to begin, instead of saying nothing is due', async () => {
    serve(true);

    openToday();

    expect(await screen.findByRole('heading', { name: 'З чого почнемо' })).toBeInTheDocument();
    expect(screen.queryByText('На сьогодні нічого не горить.')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Почати з короткого тесту' })).toBeDisabled();
  });

  it('keeps the ordinary empty state for everyone else', async () => {
    serve(false);

    openToday();

    expect(await screen.findByText('На сьогодні нічого не горить.')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'З чого почнемо' })).not.toBeInTheDocument();
  });

  it('starts a short test in the first subject ticked, saves the choice in that order, and opens the test', async () => {
    const sent = serve(true);
    const { user } = openToday();

    await user.click(await screen.findByRole('checkbox', { name: /Історія України/ }));
    await user.click(screen.getByRole('checkbox', { name: /Математика/ }));
    expect(screen.getByText(', перший тест')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Почати з короткого тесту' }));

    expect(await screen.findByText('Сесія тесту')).toBeInTheDocument();
    expect(sent.start).toEqual({ subjectId: 'history', questionCount: 10, timerEnabled: false });
    expect(sent.study).toEqual({ subjectIds: ['history', 'maths'] });
  });

  it('stays on the screen with the ticks kept when the test cannot start', async () => {
    const sent = serve(true);
    server.use(
      http.post(api('/quiz/start'), () =>
        HttpResponse.json({ message: 'У цьому предметі поки замало питань.' }, { status: 409 }),
      ),
    );
    const { user } = openToday();

    await user.click(await screen.findByRole('checkbox', { name: /Математика/ }));
    await user.click(screen.getByRole('button', { name: 'Почати з короткого тесту' }));

    expect(await screen.findByText('У цьому предметі поки замало питань.')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Математика/ })).toBeChecked();
    expect(sent.study).toBeUndefined();
  });

  it('lets the learner skip, and then shows the ordinary empty state', async () => {
    const sent = serve(true);
    const { user } = openToday();

    await user.click(await screen.findByRole('button', { name: 'Пропустити' }));

    expect(await screen.findByText('На сьогодні нічого не горить.')).toBeInTheDocument();
    expect(sent.study).toEqual({ subjectIds: [] });
  });
});
