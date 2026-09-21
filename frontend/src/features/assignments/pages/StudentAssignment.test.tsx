import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { api, server } from '@/test/server';
import { renderScreen } from '@/test/render';
import { StudentAssignmentPage } from './StudentAssignmentPage';
import { StudentAssignmentsPage } from './StudentAssignmentsPage';

/** A sentence built around an interpolated date lives in several text nodes. */
const paragraphWith = (pattern: RegExp) => (_: string, element: Element | null) =>
  element?.tagName === 'P' && pattern.test(element.textContent ?? '');

/**
 * Homework a student can see but not start, or can start twice when one
 * attempt was allowed, is worse than no homework screen at all — the teacher
 * grades what the platform let through. These tests hold the three states
 * that decide the button: not open yet, attempts left, attempts spent.
 */

const assignment = (over: Partial<Record<string, unknown>> = {}) => ({
  id: 'a-1',
  title: 'Рівняння: самостійна',
  description: 'Лінійні та квадратні рівняння.',
  group: { id: 'g-1', name: '11-А · математика' },
  subject: { id: 'sub-1', name: 'Математика', slug: 'mathematics' },
  teacherName: 'Ірина Мельник',
  openAt: null,
  dueAt: '2026-10-01T20:00:00.000Z',
  questionCount: 10,
  mockExam: null,
  attemptsAllowed: 1,
  attemptsUsed: 0,
  status: 'NOT_STARTED',
  late: false,
  ...over,
});

const openOne = () =>
  renderScreen(<StudentAssignmentPage />, {
    path: '/assignments/:assignmentId',
    route: '/assignments/a-1',
    also: [
      { path: '/quiz/:sessionId', element: <p>Робота почалася</p> },
      { path: '/assignments', element: <p>Усі завдання</p> },
    ],
  });

describe('StudentAssignmentsPage', () => {
  it('says there is nothing to do rather than showing an empty list', async () => {
    server.use(http.get(api('/assignments'), () => HttpResponse.json([])));

    renderScreen(<StudentAssignmentsPage />, { path: '/assignments', route: '/assignments' });

    expect(await screen.findByText('Завдань немає')).toBeInTheDocument();
  });

  it('lists the homework a student has been given', async () => {
    server.use(http.get(api('/assignments'), () => HttpResponse.json([assignment()])));

    renderScreen(<StudentAssignmentsPage />, {
      path: '/assignments',
      route: '/assignments',
      also: [{ path: '/assignments/:assignmentId', element: <p>Одна робота</p> }],
    });

    expect(await screen.findByText('Рівняння: самостійна')).toBeInTheDocument();
  });
});

describe('StudentAssignmentPage', () => {
  it('starts the work and goes into the session', async () => {
    server.use(
      http.get(api('/assignments/a-1'), () => HttpResponse.json(assignment())),
      http.post(api('/assignments/a-1/start'), () =>
        HttpResponse.json({ sessionId: 's-1', status: 'ACTIVE' }, { status: 201 }),
      ),
    );
    const { user } = openOne();

    await user.click(await screen.findByRole('button', { name: 'Почати роботу' }));

    expect(await screen.findByText('Робота почалася')).toBeInTheDocument();
  });

  it('keeps the work shut until it opens', async () => {
    server.use(
      http.get(api('/assignments/a-1'), () =>
        HttpResponse.json(assignment({ status: 'SCHEDULED', openAt: '2030-01-01T08:00:00.000Z' })),
      ),
    );
    openOne();

    expect(await screen.findByText(paragraphWith(/Робота відкриється/))).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Почати роботу' })).toBeDisabled();
  });

  it('refuses a second attempt when only one was allowed', async () => {
    server.use(
      http.get(api('/assignments/a-1'), () =>
        HttpResponse.json(assignment({ attemptsUsed: 1, status: 'SUBMITTED' })),
      ),
    );
    openOne();

    expect(await screen.findByText(paragraphWith(/Роботу здано/))).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Пройти ще раз' })).toBeDisabled();
  });

  it('accepts late work and says it will be marked as late', async () => {
    server.use(
      http.get(api('/assignments/a-1'), () =>
        HttpResponse.json(assignment({ status: 'OVERDUE', dueAt: '2020-01-01T20:00:00.000Z' })),
      ),
    );
    openOne();

    expect(await screen.findByText(paragraphWith(/позначена як пізня/))).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Почати роботу' })).toBeEnabled();
  });

  it('shows a mock paper as a paper on a clock', async () => {
    server.use(
      http.get(api('/assignments/a-1'), () =>
        HttpResponse.json(
          assignment({ mockExam: { taskCount: 22, minutes: 180, subjectSlug: 'mathematics' } }),
        ),
      ),
    );
    openOne();

    expect(await screen.findByText(/годинник на 180 хвилин/)).toBeInTheDocument();
    expect(screen.getByText(/пробний НМТ · 180 хв на весь зошит/)).toBeInTheDocument();
  });

  it('says so when the work belongs to somebody else', async () => {
    server.use(http.get(api('/assignments/a-1'), () => HttpResponse.json({}, { status: 404 })));
    openOne();

    expect(await screen.findByText('Завдання не знайдено')).toBeInTheDocument();
  });
});
