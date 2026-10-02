import { HttpResponse, http } from 'msw';
import { afterEach, describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { api, server } from '@/test/server';
import { renderScreen } from '@/test/render';
import { useAuthStore } from '@/stores/auth-store';
import { MetricsSection } from './MetricsSection';
import type { PlatformMetrics } from '@/features/admin/types/admin.types';

/**
 * The screen the owner opens when a figure in the morning digest looked odd.
 *
 * Two things are worth holding still. The funnel has to name where people are
 * lost rather than leave two numbers a line apart to be subtracted — that gap
 * is the entire reason the panel exists. And the page has to read as calm
 * rather than broken on the day nothing happened, which for a platform with
 * no users yet is most days.
 */

const metrics = (over: Partial<PlatformMetrics> = {}): PlatformMetrics => ({
  totals: { accounts: 13, learners: 8, teachers: 2, testsCompleted: 22 },
  today: { newAccounts: 1, testsCompleted: 0, activePeople: 0 },
  week: { newAccounts: 4, testsCompleted: 6, activePeople: 3 },
  funnel: { registered: 5, verified: 5, tookATest: 2, returned: 0 },
  registrations: Array.from({ length: 30 }, (_, index) => ({
    day: `2026-09-${String(index + 1).padStart(2, '0')}`,
    count: index === 10 ? 4 : 0,
  })),
  subjects: [
    { subject: 'Історія України', sessions: 11, people: 2 },
    { subject: 'Математика', sessions: 9, people: 3 },
  ],
  recent: [
    {
      username: 'olena',
      role: 'USER',
      createdAt: '2026-10-01T09:00:00.000Z',
      verified: true,
      tookATest: true,
    },
    {
      username: 'petro',
      role: 'USER',
      createdAt: '2026-09-30T09:00:00.000Z',
      verified: false,
      tookATest: false,
    },
  ],
  ...over,
});

const serve = (body: PlatformMetrics) =>
  server.use(http.get(api('/admin/metrics'), () => HttpResponse.json(body)));

const open = () => renderScreen(<MetricsSection />, { path: '/admin', route: '/admin' });

describe('MetricsSection', () => {
  const signedIn = () => useAuthStore.setState({ status: 'authenticated', accessToken: 'token' });
  afterEach(() => useAuthStore.setState({ status: 'loading', accessToken: null }));

  it('leads with the week and keeps today beside it', async () => {
    signedIn();
    serve(metrics());
    open();

    expect(await screen.findByText('нових за тиждень')).toBeInTheDocument();
    expect(screen.getByText('сьогодні — 1')).toBeInTheDocument();
  });

  it('names where people were lost instead of leaving it to be subtracted', async () => {
    signedIn();
    serve(metrics());
    open();

    // 5 confirmed, 2 took a test: three stopped there, and that is the number
    // the owner is looking for.
    expect(await screen.findByText('тут втрачено 3')).toBeInTheDocument();
    expect(screen.getByText('тут втрачено 2')).toBeInTheDocument();
  });

  it('says nothing about a step nobody dropped out of', async () => {
    signedIn();
    serve(metrics({ funnel: { registered: 4, verified: 4, tookATest: 4, returned: 4 } }));
    open();

    expect(await screen.findByText('Вирва')).toBeInTheDocument();
    expect(screen.queryByText(/тут втрачено/)).not.toBeInTheDocument();
  });

  it('does not promise that learners and teachers add up to every account', async () => {
    signedIn();
    serve(metrics());
    open();

    // 8 + 2 ≠ 13: the rest are administrators, so the sentence says «з них».
    expect(await screen.findByText(/з них 8 учнів і 2 вчителі/)).toBeInTheDocument();
  });

  it('reads as quiet rather than broken when nothing has happened', async () => {
    signedIn();
    serve(
      metrics({
        totals: { accounts: 0, learners: 0, teachers: 0, testsCompleted: 0 },
        today: { newAccounts: 0, testsCompleted: 0, activePeople: 0 },
        week: { newAccounts: 0, testsCompleted: 0, activePeople: 0 },
        funnel: { registered: 0, verified: 0, tookATest: 0, returned: 0 },
        registrations: Array.from({ length: 30 }, (_, index) => ({
          day: `2026-09-${String(index + 1).padStart(2, '0')}`,
          count: 0,
        })),
        subjects: [],
        recent: [],
      }),
    );
    open();

    expect(
      await screen.findByText('За місяць ніхто не реєструвався, тож і міряти поки нічого.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Жодної реєстрації за місяць.')).toBeInTheDocument();
    expect(screen.getByText('Поки нікого')).toBeInTheDocument();
  });

  it('marks an account that never confirmed its address', async () => {
    signedIn();
    serve(metrics());
    open();

    expect(await screen.findByText('@petro')).toBeInTheDocument();
    expect(screen.getByText('без пошти')).toBeInTheDocument();
    expect(screen.getByText('без тесту')).toBeInTheDocument();
  });

  it('offers a way back when the figures cannot be read', async () => {
    signedIn();
    server.use(http.get(api('/admin/metrics'), () => HttpResponse.json({}, { status: 500 })));
    open();

    expect(await screen.findByRole('button', { name: /Спробувати|Повторити/ })).toBeInTheDocument();
  });
});
