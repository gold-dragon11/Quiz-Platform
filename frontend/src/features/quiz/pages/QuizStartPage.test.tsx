import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { api, server } from '@/test/server';
import { renderScreen } from '@/test/render';
import { QuizStartPage } from './QuizStartPage';

/**
 * The start screen exists to stop a press that the backend would refuse.
 * One session at a time is its rule: with a session already open, Start is
 * not offered at all, and a topic too thin to fill a quiz says so before the
 * question count can be set to something impossible.
 */

const SUBJECT = 'subject-history';

const session = {
  sessionId: 's-1',
  mode: 'SUBJECT_QUIZ',
  subjectId: SUBJECT,
  topicId: null,
  questionCount: 10,
  timerEnabled: false,
  status: 'ACTIVE',
  startedAt: '2026-09-21T09:00:00.000Z',
  expiresAt: null,
  liveDuelId: null,
};

const catalogue = (available = 40) => [
  http.get(api('/subjects'), () =>
    HttpResponse.json([{ id: SUBJECT, name: 'Історія України', slug: 'history-of-ukraine' }]),
  ),
  http.get(api(`/subjects/${SUBJECT}/topics`), () =>
    HttpResponse.json([{ id: 'topic-1', name: 'Київська Русь', slug: 'kyivan-rus' }]),
  ),
  http.get(api('/quiz/available'), () => HttpResponse.json({ available })),
];

const open = () =>
  renderScreen(<QuizStartPage />, {
    path: '/quiz',
    route: '/quiz',
    also: [{ path: '/quiz/:sessionId', element: <p>Сесія тесту</p> }],
  });

describe('QuizStartPage', () => {
  it('starts a quiz and goes straight into it', async () => {
    let sent: unknown = null;
    server.use(
      ...catalogue(),
      http.get(api('/quiz/active'), () => HttpResponse.json({ session: null })),
      http.post(api('/quiz/start'), async ({ request }) => {
        sent = await request.json();
        return HttpResponse.json(session, { status: 201 });
      }),
    );
    const { user } = open();

    await screen.findByRole('option', { name: 'Історія України' });
    await user.selectOptions(screen.getByLabelText('Предмет'), SUBJECT);
    await user.click(await screen.findByRole('button', { name: 'Почати тест' }));

    expect(await screen.findByText('Сесія тесту')).toBeInTheDocument();
    expect(sent).toMatchObject({ subjectId: SUBJECT });
  });

  it('will not let a second session start while one is open, and points back to it', async () => {
    server.use(
      ...catalogue(),
      http.get(api('/quiz/active'), () => HttpResponse.json({ session })),
    );
    open();

    expect(await screen.findByText(/У вас є незавершений тест/)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Почати тест' })).toBeDisabled());
    expect(screen.getByRole('link', { name: 'повернутися до нього' })).toBeInTheDocument();
  });

  it('holds Start back when the chosen subject has no questions to draw', async () => {
    server.use(
      ...catalogue(0),
      http.get(api('/quiz/active'), () => HttpResponse.json({ session: null })),
    );
    const { user } = open();

    await screen.findByRole('option', { name: 'Історія України' });
    await user.selectOptions(screen.getByLabelText('Предмет'), SUBJECT);

    await waitFor(() => expect(screen.getByRole('button', { name: 'Почати тест' })).toBeDisabled());
  });

  it('offers to try again when the catalogue cannot be loaded', async () => {
    server.use(
      http.get(api('/subjects'), () => HttpResponse.json({}, { status: 500 })),
      http.get(api('/quiz/active'), () => HttpResponse.json({ session: null })),
    );
    open();

    expect(await screen.findByText(/Не вдалося завантажити предмети/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Спробувати ще раз' })).toBeInTheDocument();
  });
});
