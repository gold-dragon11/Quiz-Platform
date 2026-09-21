import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { api, server } from '@/test/server';
import { renderScreen } from '@/test/render';
import { AssignmentReviewPage } from './AssignmentReviewPage';

/**
 * What a tutor opens the platform for: who has not done the work. The list is
 * ordered by what is outstanding rather than by name, the late work is
 * counted rather than hidden, and a student who left the group keeps their
 * submission — the work was issued to them and they did it.
 */

const assignment = (over: Partial<Record<string, unknown>> = {}) => ({
  id: 'a-1',
  groupId: 'g-1',
  title: 'Рівняння: самостійна',
  description: 'Лінійні та квадратні рівняння.',
  openAt: null,
  dueAt: '2026-09-12T20:00:00.000Z',
  attemptsAllowed: 1,
  scoredAttempt: 'FIRST',
  explanations: 'AFTER_DUE',
  questionCount: 10,
  mockExam: null,
  targetCount: 7,
  submittedCount: 6,
  createdAt: '2026-09-05T10:00:00.000Z',
  ...over,
});

const submission = (
  name: string,
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED',
  over: Partial<Record<string, unknown>> = {},
) => ({
  student: { id: `s-${name}`, displayName: name, username: null, stillInGroup: true },
  status,
  attempts: status === 'SUBMITTED' ? 1 : 0,
  score:
    status === 'SUBMITTED'
      ? {
          correctAnswers: 6,
          totalQuestions: 10,
          accuracy: 60,
          completedAt: '2026-09-11T18:00:00.000Z',
          durationSeconds: 600,
          late: false,
          testPoints: null,
          maxTestPoints: null,
          scaledScore: null,
        }
      : null,
  ...over,
});

const open = () =>
  renderScreen(<AssignmentReviewPage />, {
    path: '/teacher/assignments/:assignmentId',
    route: '/teacher/assignments/a-1',
    also: [{ path: '/teacher/groups/:groupId/students/:studentId', element: <p>Профіль учня</p> }],
  });

describe('AssignmentReviewPage', () => {
  it('counts who handed in, and who was late', async () => {
    server.use(
      http.get(api('/teacher/assignments/a-1'), () => HttpResponse.json(assignment())),
      http.get(api('/teacher/assignments/a-1/submissions'), () =>
        HttpResponse.json([
          submission('Назар Олійник', 'SUBMITTED', {
            score: {
              correctAnswers: 5,
              totalQuestions: 10,
              accuracy: 50,
              completedAt: '2026-09-13T09:00:00.000Z',
              durationSeconds: 700,
              late: true,
              testPoints: null,
              maxTestPoints: null,
              scaledScore: null,
            },
          }),
          submission('Софія Ткаченко', 'SUBMITTED'),
          submission('Вікторія Поліщук', 'NOT_STARTED'),
        ]),
      ),
      http.get(api('/teacher/assignments/a-1/breakdown'), () => HttpResponse.json([])),
    );
    open();

    expect(await screen.findByText('6/7')).toBeInTheDocument();
    expect(screen.getByText('здали')).toBeInTheDocument();
    expect(screen.getByText('із запізненням')).toBeInTheDocument();
    expect(await screen.findByText('1')).toBeInTheDocument();
  });

  it('puts the student who has not started at the top of the list', async () => {
    server.use(
      http.get(api('/teacher/assignments/a-1'), () => HttpResponse.json(assignment())),
      http.get(api('/teacher/assignments/a-1/submissions'), () =>
        HttpResponse.json([
          submission('Софія Ткаченко', 'SUBMITTED'),
          submission('Вікторія Поліщук', 'NOT_STARTED'),
        ]),
      ),
      http.get(api('/teacher/assignments/a-1/breakdown'), () => HttpResponse.json([])),
    );
    open();

    const names = await screen.findAllByText(/Ткаченко|Поліщук/);
    expect(names[0]).toHaveTextContent('Вікторія Поліщук');
    expect(screen.getByText('не розпочато')).toBeInTheDocument();
  });

  it('describes a mock paper by its 100–200 score, not by accuracy', async () => {
    server.use(
      http.get(api('/teacher/assignments/a-1'), () =>
        HttpResponse.json(
          assignment({
            title: 'Пробний НМТ з математики',
            mockExam: { taskCount: 22, minutes: 180, subjectSlug: 'mathematics' },
          }),
        ),
      ),
      http.get(api('/teacher/assignments/a-1/submissions'), () => HttpResponse.json([])),
      http.get(api('/teacher/assignments/a-1/breakdown'), () => HttpResponse.json([])),
    );
    open();

    expect(await screen.findByText('середній бал')).toBeInTheDocument();
    expect(screen.queryByText('середня точність')).not.toBeInTheDocument();
  });

  it('says so when the work belongs to another teacher', async () => {
    server.use(http.get(api('/teacher/assignments/a-1'), () => HttpResponse.json({}, { status: 404 })));
    open();

    expect(await screen.findByText('Завдання не знайдено')).toBeInTheDocument();
  });
});
