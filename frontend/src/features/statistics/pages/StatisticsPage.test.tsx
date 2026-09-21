import { HttpResponse, http } from 'msw';
import { afterEach, describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { api, server } from '@/test/server';
import { renderScreen } from '@/test/render';
import { useAuthStore } from '@/stores/auth-store';
import { StatisticsPage } from './StatisticsPage';

/**
 * One route, two completely different screens: a learner's own figures, and a
 * teacher's view of their groups. The split is by role, and getting it wrong
 * shows a teacher an XP level they can never earn — or a student the
 * analytics of a class they are in.
 */

const account = (role: 'USER' | 'TEACHER') =>
  http.get(api('/auth/me'), () =>
    HttpResponse.json({
      id: 'u-1',
      email: 'someone@example.com',
      role,
      accountStatus: 'ACTIVE',
      isDemo: false,
      profile: { displayName: 'Олена', username: 'olena' },
      avatar: null,
    }),
  );

const overall = (over: Partial<Record<string, number | string>> = {}) => ({
  totalXP: 927,
  currentLevel: 10,
  completedQuizzes: 12,
  averageAccuracy: '68.00',
  totalQuestions: 151,
  correctAnswers: 103,
  totalStudyTime: 20_760,
  xpForCurrentLevel: 900,
  xpForNextLevel: 1000,
  xpIntoLevel: 27,
  completionPercent: 27,
  ...over,
});

const learnerData = [
  http.get(api('/statistics'), () => HttpResponse.json(overall())),
  http.get(api('/statistics/subjects'), () => HttpResponse.json([])),
  http.get(api('/statistics/topics'), () => HttpResponse.json([])),
  http.get(api('/statistics/mistakes'), () => HttpResponse.json([])),
  http.get(api('/statistics/recent'), () =>
    HttpResponse.json({ items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 }),
  ),
];

const open = () => renderScreen(<StatisticsPage />, { path: '/statistics', route: '/statistics' });

describe('StatisticsPage', () => {
  const signedIn = () => useAuthStore.setState({ status: 'authenticated', accessToken: 'token' });
  afterEach(() => useAuthStore.setState({ status: 'loading', accessToken: null }));

  it('shows a learner their level and the figures behind it', async () => {
    signedIn();
    server.use(account('USER'), ...learnerData);
    open();

    expect(await screen.findByText('Ваші цифри')).toBeInTheDocument();
    // The XP figure counts up from zero, so the steady text is asserted instead.
    expect(await screen.findByText('Рівень 10')).toBeInTheDocument();
    expect(await screen.findByText('Ще 73 XP до рівня 11.')).toBeInTheDocument();
    expect(screen.getByText('Теми')).toBeInTheDocument();
    expect(screen.getByText('Останні тести')).toBeInTheDocument();
  });

  it('does not pretend a new learner has results', async () => {
    signedIn();
    server.use(
      account('USER'),
      http.get(api('/statistics'), () =>
        HttpResponse.json(
          overall({
            totalXP: 0,
            currentLevel: 1,
            completedQuizzes: 0,
            averageAccuracy: '0.00',
            totalQuestions: 0,
            correctAnswers: 0,
            totalStudyTime: 0,
            xpIntoLevel: 0,
            completionPercent: 0,
          }),
        ),
      ),
      ...learnerData.slice(1),
    );
    open();

    expect(await screen.findByText('Ваші цифри')).toBeInTheDocument();
    expect(await screen.findByText('Рівень 1')).toBeInTheDocument();
    expect(screen.queryByText('Рівень 10')).not.toBeInTheDocument();
  });

  it('gives a teacher the teaching view instead of an XP level', async () => {
    signedIn();
    server.use(
      account('TEACHER'),
      http.get(api('/teacher/groups'), () => HttpResponse.json([])),
    );
    open();

    expect(await screen.findByText('Викладання')).toBeInTheDocument();
    expect(screen.queryByText('Ваші цифри')).not.toBeInTheDocument();
  });
});
