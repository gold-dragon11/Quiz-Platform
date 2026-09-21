import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { api, server } from '@/test/server';
import { renderScreen } from '@/test/render';
import { TeacherGroupsPage } from './TeacherGroupsPage';

/**
 * A tutor's first screen: create a class, then see it with its roster count.
 * An archived class stays visible — last year's history is what a tutor shows
 * when deciding to renew — and a group without a subject is refused before
 * the request is made, because the subject fixes which part of the bank its
 * homework may draw from.
 */

const group = (over: Partial<Record<string, unknown>> = {}) => ({
  id: 'g-1',
  name: '11-А · математика',
  subject: { id: 'sub-1', name: 'Математика', slug: 'mathematics' },
  inviteCode: 'MATH11A',
  studentCount: 7,
  archivedAt: null,
  createdAt: '2026-09-01T10:00:00.000Z',
  ...over,
});

const subjects = http.get(api('/subjects'), () =>
  HttpResponse.json([{ id: 'sub-1', name: 'Математика', slug: 'mathematics' }]),
);

const open = () =>
  renderScreen(<TeacherGroupsPage />, {
    path: '/teacher/groups',
    route: '/teacher/groups',
    also: [{ path: '/teacher/groups/:groupId', element: <p>Сторінка групи</p> }],
  });

describe('TeacherGroupsPage', () => {
  it('invites the first group to be created instead of showing an empty list', async () => {
    server.use(
      subjects,
      http.get(api('/teacher/groups'), () => HttpResponse.json([])),
    );
    open();

    expect(await screen.findByText('Груп ще немає')).toBeInTheDocument();
  });

  it('creates a group and shows it on the roster', async () => {
    let created: unknown = null;
    let groups: unknown[] = [];
    server.use(
      subjects,
      http.get(api('/teacher/groups'), () => HttpResponse.json(groups)),
      http.post(api('/teacher/groups'), async ({ request }) => {
        created = await request.json();
        groups = [group()];
        return HttpResponse.json(group(), { status: 201 });
      }),
    );
    const { user } = open();

    await screen.findByRole('option', { name: 'Математика' });
    await user.type(screen.getByLabelText('Назва групи'), '11-А · математика');
    await user.selectOptions(screen.getByLabelText('Предмет'), 'sub-1');
    await user.click(screen.getByRole('button', { name: 'Створити' }));

    expect(await screen.findByText('11-А · математика')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('учнів')).toBeInTheDocument();
    expect(created).toEqual({ name: '11-А · математика', subjectId: 'sub-1' });
  });

  it('will not create a group without a subject', async () => {
    let calls = 0;
    server.use(
      subjects,
      http.get(api('/teacher/groups'), () => HttpResponse.json([])),
      http.post(api('/teacher/groups'), () => {
        calls += 1;
        return HttpResponse.json(group(), { status: 201 });
      }),
    );
    const { user } = open();

    await screen.findByRole('option', { name: 'Математика' });
    await user.type(screen.getByLabelText('Назва групи'), 'Без предмета');
    await user.click(screen.getByRole('button', { name: 'Створити' }));

    expect(calls).toBe(0);
  });

  it('keeps an archived class in sight, under its own heading', async () => {
    server.use(
      subjects,
      http.get(api('/teacher/groups'), () =>
        HttpResponse.json([
          group(),
          group({ id: 'g-2', name: '11-Б · торішня', archivedAt: '2026-06-30T10:00:00.000Z' }),
        ]),
      ),
    );
    open();

    expect(await screen.findByText('11-Б · торішня')).toBeInTheDocument();
    expect(screen.getByText('Заархівовані')).toBeInTheDocument();
  });
});
