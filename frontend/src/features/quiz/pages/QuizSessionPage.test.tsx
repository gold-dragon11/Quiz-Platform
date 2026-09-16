import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { api, server } from '@/test/server';
import { renderScreen } from '@/test/render';
import { QuizSessionPage } from './QuizSessionPage';

const option = (id: string, content: string, order: number) => ({ id, content, imageUrl: null, order });

const question = (id: string, title: string) => ({
  id,
  type: 'SINGLE_CHOICE',
  subjectSlug: 'history-of-ukraine',
  title,
  difficulty: null,
  imageUrl: null,
  passage: null,
  passageOrder: null,
  answerOptions: [option(`${id}-a`, 'Андрусівське перемирʼя', 0), option(`${id}-b`, 'Гадяцький договір', 1)],
});

const session = (status: 'ACTIVE' | 'ABANDONED' | 'COMPLETED') => ({
  sessionId: 's-1',
  mode: 'SUBJECT_QUIZ',
  subjectId: 'subject-1',
  topicId: 'topic-1',
  questionCount: 2,
  timerEnabled: false,
  status,
  startedAt: '2026-09-16T09:00:00.000Z',
  expiresAt: null,
});

const resume = (status: 'ACTIVE' | 'ABANDONED' | 'COMPLETED' = 'ACTIVE') => ({
  session: session(status),
  questions: [
    question('q-1', 'Який договір 1667 року поділив Україну по Дніпру?'),
    question('q-2', 'Друге питання'),
  ],
  answers: [],
});

const openSession = () =>
  renderScreen(<QuizSessionPage />, {
    path: '/quiz/:sessionId',
    route: '/quiz/s-1',
    also: [{ path: '/quiz/:sessionId/result', element: <p>Результат</p> }],
  });

describe('QuizSessionPage', () => {
  it('saves an answer as soon as it is chosen', async () => {
    let saved: { questionId: string; selectedAnswer: unknown } | null = null;
    server.use(
      http.get(api('/quiz/s-1'), () => HttpResponse.json(resume())),
      http.post(api('/quiz/s-1/answers'), async ({ request }) => {
        saved = (await request.json()) as typeof saved;
        return HttpResponse.json({ ok: true });
      }),
    );
    const { user } = openSession();

    await user.click(await screen.findByRole('radio', { name: /Андрусівське/ }));

    expect(await screen.findByText('Збережено')).toBeInTheDocument();
    // Answers go to the backend, never only into component state: a reload
    // has to find the work where the learner left it.
    expect(saved).toEqual({ questionId: 'q-1', selectedAnswer: { answerOptionId: 'q-1-a' } });
  });

  it('asks before handing the work in, then shows the result', async () => {
    server.use(
      http.get(api('/quiz/s-1'), () => HttpResponse.json(resume())),
      http.post(api('/quiz/s-1/answers'), () => HttpResponse.json({})),
      http.post(api('/quiz/s-1/complete'), () =>
        HttpResponse.json({
          correctAnswers: 1,
          incorrectAnswers: 1,
          unansweredQuestions: 0,
          totalQuestions: 2,
          accuracy: '50.00',
          score: '50.00',
          xpEarned: 50,
          completedAt: '2026-09-16T09:10:00.000Z',
        }),
      ),
    );
    const { user } = openSession();

    await user.click(await screen.findByRole('button', { name: 'Завершити тест зараз' }));
    expect(await screen.findByText('Завершити тест?')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Завершити тест' }));

    await waitFor(() => expect(screen.getByText('Результат')).toBeInTheDocument());
  });

  it('tells the owner of a session closed by the sweep what happened', async () => {
    server.use(http.get(api('/quiz/s-1'), () => HttpResponse.json(resume('ABANDONED'))));

    openSession();

    expect(await screen.findByText(/Цей тест закрито/)).toBeInTheDocument();
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
  });

  it('sends a completed session to its result instead of reopening it', async () => {
    server.use(http.get(api('/quiz/s-1'), () => HttpResponse.json(resume('COMPLETED'))));

    openSession();

    await waitFor(() => expect(screen.getByText('Результат')).toBeInTheDocument());
  });
});
