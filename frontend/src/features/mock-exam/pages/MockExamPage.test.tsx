import { HttpResponse, http } from 'msw';
import { afterEach, describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { api, server } from '@/test/server';
import { renderScreen } from '@/test/render';
import { useAuthStore } from '@/stores/auth-store';
import { MockExamPage } from './MockExamPage';

/**
 * A mock sitting is the one screen where the product promises the exam day:
 * the whole paper, one clock, the official 100–200 scale. What must hold here
 * is that a whole block can be sat, not only a single subject, and that the
 * refusal for a bank too thin to fill a paper is the server's sentence rather
 * than a blank screen.
 */

const SUBJECT = 'subject-maths';

const user = (role: 'USER' | 'TEACHER') =>
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

const catalogue = [
  http.get(api('/subjects'), () =>
    HttpResponse.json([{ id: SUBJECT, name: 'Математика', slug: 'mathematics' }]),
  ),
  http.get(api('/quiz/mock-exam/blocks'), () =>
    HttpResponse.json([
      { slug: 'ukr-math', title: 'Українська мова + математика', subjectNames: ['Українська', 'Математика'] },
    ]),
  ),
  http.get(api('/quiz/active'), () => HttpResponse.json({ session: null })),
  http.get(api('/quiz/mock-exam/history'), () => HttpResponse.json([])),
  http.get(api('/quiz/mock-exam/spec'), () =>
    HttpResponse.json({
      questionCount: 22,
      minutes: 180,
      paper: {
        title: 'Математика, НМТ 2026',
        taskCount: 22,
        maxTestPoints: 32,
        timingNote: '180 хвилин',
        sections: [{ from: 1, to: 15, instruction: 'Завдання з однією правильною відповіддю' }],
      },
    }),
  ),
];

const open = () =>
  renderScreen(<MockExamPage />, {
    path: '/mock-exam',
    route: '/mock-exam',
    also: [{ path: '/quiz/:sessionId', element: <p>Зошит відкрито</p> }],
  });

describe('MockExamPage', () => {
  // The current-user query runs only while the store says the session is
  // authenticated, and the teacher's note depends on that query.
  const signedIn = () => useAuthStore.setState({ status: 'authenticated', accessToken: 'token' });
  afterEach(() => useAuthStore.setState({ status: 'loading', accessToken: null }));

  it('will not start until a paper is chosen', async () => {
    server.use(user('USER'), ...catalogue);
    open();

    expect(await screen.findByRole('button', { name: 'Почати роботу' })).toBeDisabled();
  });

  it('sits a whole block, not only one subject', async () => {
    let sent: unknown = null;
    server.use(
      user('USER'),
      ...catalogue,
      http.post(api('/quiz/mock-exam/start'), async ({ request }) => {
        sent = await request.json();
        return HttpResponse.json({ sessionId: 's-1', status: 'ACTIVE' }, { status: 201 });
      }),
    );
    const screenUnderTest = open();

    await screen.findByRole('option', { name: 'Українська мова + математика' });
    await screenUnderTest.user.selectOptions(screen.getByLabelText('Предмет або блок'), 'block:ukr-math');
    await screenUnderTest.user.click(screen.getByRole('button', { name: 'Почати роботу' }));

    expect(await screen.findByText('Зошит відкрито')).toBeInTheDocument();
    expect(sent).toEqual({ block: 'ukr-math' });
  });

  it('passes on the server’s refusal when the bank cannot fill a paper', async () => {
    server.use(
      user('USER'),
      ...catalogue,
      http.post(api('/quiz/mock-exam/start'), () =>
        HttpResponse.json({ message: 'Для пробної роботи бракує опублікованих питань.' }, { status: 409 }),
      ),
    );
    const screenUnderTest = open();

    await screen.findByRole('option', { name: 'Математика' });
    await screenUnderTest.user.selectOptions(screen.getByLabelText('Предмет або блок'), SUBJECT);
    await screenUnderTest.user.click(screen.getByRole('button', { name: 'Почати роботу' }));

    expect(await screen.findByText('Для пробної роботи бракує опублікованих питань.')).toBeInTheDocument();
  });

  it('tells a teacher the sitting earns them no XP, and shows them no attempt history', async () => {
    signedIn();
    server.use(user('TEACHER'), ...catalogue);
    open();

    expect(await screen.findByText(/XP і рівень вам не нараховуються/)).toBeInTheDocument();
    expect(screen.queryByText('Ваші спроби')).not.toBeInTheDocument();
  });
});
