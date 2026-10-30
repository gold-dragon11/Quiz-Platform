import { HttpResponse, http } from 'msw';
import { afterEach, describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import { api, server } from '@/test/server';
import { renderScreen } from '@/test/render';
import { useAuthStore } from '@/stores/auth-store';
import { StatisticsPage } from './StatisticsPage';

/**
 * One route, two completely different screens: a learner's own figures, and a
 * teacher's view of their groups. The split is by role, and getting it wrong
 * shows a teacher a learner's progress they can never have — or a student the
 * analytics of a class they are in.
 *
 * A learner's screen leads with what they have mastered (decision 46); XP and
 * the level are gone from it entirely, not merely hidden.
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

const overall = {
  completedQuizzes: 12,
  averageAccuracy: '68.00',
  totalQuestions: 151,
  correctAnswers: 103,
  totalStudyTime: 20_760,
};

const progress = {
  subjects: [
    { subjectId: 's-math', subjectName: 'Математика', topicsTotal: 31, mastered: 5, inProgress: 3 },
    { subjectId: 's-hist', subjectName: 'Історія України', topicsTotal: 25, mastered: 0, inProgress: 1 },
  ],
  topics: [],
  mistakesFixed: 37,
};

const learnerData = (over: { progress?: unknown; subjects?: unknown; mocks?: unknown } = {}) => [
  http.get(api('/statistics'), () => HttpResponse.json(overall)),
  http.get(api('/statistics/progress'), () => HttpResponse.json(over.progress ?? progress)),
  http.get(api('/statistics/subjects'), () => HttpResponse.json(over.subjects ?? [])),
  http.get(api('/statistics/topics'), () => HttpResponse.json([])),
  http.get(api('/statistics/mistakes'), () => HttpResponse.json([])),
  http.get(api('/statistics/recent'), () =>
    HttpResponse.json({ items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 }),
  ),
  http.get(api('/quiz/mock-exam/history'), () => HttpResponse.json(over.mocks ?? [])),
];

const open = () => renderScreen(<StatisticsPage />, { path: '/statistics', route: '/statistics' });

describe('StatisticsPage', () => {
  const signedIn = () => useAuthStore.setState({ status: 'authenticated', accessToken: 'token' });
  afterEach(() => useAuthStore.setState({ status: 'loading', accessToken: null }));

  it('leads a learner with the topics mastered, out of every topic there is', async () => {
    signedIn();
    server.use(account('USER'), ...learnerData());
    const { container } = open();

    const standing = await screen.findByRole('region', { name: 'Освоєні теми' });
    expect(standing).toHaveTextContent('5з 56');
    expect(within(standing).getByText('Ще 4 теми в роботі. Виправлено 37 помилок.')).toBeInTheDocument();
    expect(within(standing).getByText('Математика').closest('li')).toHaveTextContent('5 з 31, ще 3 в роботі');
    // The rule is printed, so the figure can be checked rather than trusted.
    expect(within(standing).getByText(/останні 10 відповідей/)).toBeInTheDocument();
    expect(screen.getByText('Теми')).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/XP|Рівень/);
  });

  it('does not pretend a new learner has results', async () => {
    signedIn();
    server.use(
      account('USER'),
      ...learnerData({
        progress: {
          subjects: progress.subjects.map((subject) => ({ ...subject, mastered: 0, inProgress: 0 })),
          topics: [],
          mistakesFixed: 0,
        },
      }),
    );
    open();

    const standing = await screen.findByRole('region', { name: 'Освоєні теми' });
    expect(standing).toHaveTextContent('0з 56');
    expect(within(standing).getByText('Тем у роботі поки немає. Виправлено 0 помилок.')).toBeInTheDocument();
  });

  it('adds the latest mock score to its subject, and the one before it', async () => {
    signedIn();
    const sitting = (score: number | null, day: number) => ({
      sessionId: `m-${day}`,
      subject: { id: 's-math', name: 'Математика' },
      correctAnswers: 17,
      totalQuestions: 22,
      blockTitle: null,
      accuracy: 77,
      testPoints: 21,
      maxTestPoints: 32,
      scaledScore: score,
      durationSeconds: 3600,
      completedAt: `2026-10-${String(day).padStart(2, '0')}T10:00:00.000Z`,
    });
    server.use(
      account('USER'),
      ...learnerData({
        subjects: [
          {
            subjectId: 's-math',
            subjectName: 'Математика',
            completedQuizzes: 4,
            totalQuestions: 60,
            averageAccuracy: '71.00',
          },
        ],
        mocks: [sitting(148, 10), sitting(155, 20)],
      }),
    );
    open();

    expect(await screen.findByText(/пробний НМТ 155, до того 148/)).toBeInTheDocument();
  });

  it('gives a teacher the teaching view instead of a learner’s progress', async () => {
    signedIn();
    server.use(
      account('TEACHER'),
      http.get(api('/teacher/groups'), () => HttpResponse.json([])),
    );
    open();

    // The groups, not mastery: a teacher's statistics are about the class.
    expect(await screen.findByText('Активних груп немає')).toBeInTheDocument();
    expect(screen.queryByText('Освоєно тем')).not.toBeInTheDocument();
  });
});
