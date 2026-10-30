import { HttpResponse, http, type JsonBodyType } from 'msw';
import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { api, server } from '@/test/server';
import { renderScreen } from '@/test/render';
import { QuizResultPage } from './QuizResultPage';

const review = {
  result: {
    correctAnswers: 4,
    incorrectAnswers: 1,
    unansweredQuestions: 0,
    totalQuestions: 5,
    accuracy: '80.00',
    score: '80.00',
    completedAt: '2026-09-16T09:00:00.000Z',
  },
  questions: [],
  progress: null as JsonBodyType,
  session: { subjectId: 'subject-1', topicId: null, mode: 'SUBJECT_QUIZ' },
};

const progress = {
  ladder: [
    { days: 1, count: 3 },
    { days: 3, count: 1 },
  ],
  fixed: 2,
  topics: [
    {
      topicId: 't-quad',
      topicName: 'Квадратична функція',
      before: 70,
      after: 100,
      mastered: true,
      masteredNow: true,
    },
    {
      topicId: 't-trig',
      topicName: 'Тригонометрія',
      before: 40,
      after: 65,
      mastered: false,
      masteredNow: false,
    },
  ],
};

const serve = (body: JsonBodyType, due = 0) =>
  server.use(
    http.get(api('/quiz/s-1/result'), () => HttpResponse.json(body)),
    http.get(api('/quiz/mistake-review'), () =>
      HttpResponse.json({ due, scheduled: 0, cleared: 0, ladder: [] }),
    ),
  );

const openResult = () =>
  renderScreen(<QuizResultPage />, { path: '/quiz/:sessionId/result', route: '/quiz/s-1/result' });

describe('QuizResultPage', () => {
  it('shows the score of a finished quiz', async () => {
    serve(review);

    openResult();

    expect(await screen.findByText('80%')).toBeInTheDocument();
    expect(screen.getByText('правильних 4 з 5')).toBeInTheDocument();
  });

  it('closes the loop: when the mistakes come back, what was fixed, how the topics moved', async () => {
    serve({ ...review, progress });

    openResult();

    expect(await screen.findByRole('heading', { name: 'Що далі' })).toBeInTheDocument();
    expect(screen.getByText('3 питання завтра, 1 питання через 3 дні')).toBeInTheDocument();
    expect(screen.getByText('2 питання')).toBeInTheDocument();
    expect(screen.getByText('тепер освоєна, 100% в останніх відповідях')).toBeInTheDocument();
    expect(screen.getByText('було 40%, стало 65%')).toBeInTheDocument();
  });

  it('says nothing about a loop a teacher’s sitting does not have', async () => {
    serve(review);

    openResult();

    expect(await screen.findByText('80%')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Що далі' })).not.toBeInTheDocument();
  });

  it('offers the reviews already waiting as a second way on', async () => {
    serve({ ...review, progress }, 5);

    openResult();

    expect(await screen.findByRole('button', { name: 'Повторити помилки (5)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Пройти ще один тест' })).toBeInTheDocument();
  });

  it('explains an unfinished quiz instead of failing', async () => {
    server.use(
      http.get(api('/quiz/s-1/result'), () =>
        HttpResponse.json({ message: 'Ця сесія тесту ще не завершена.' }, { status: 409 }),
      ),
      http.get(api('/quiz/mistake-review'), () =>
        HttpResponse.json({ due: 0, scheduled: 0, cleared: 0, ladder: [] }),
      ),
    );

    openResult();

    expect(await screen.findByText(/Цей тест ще не завершено/)).toBeInTheDocument();
  });

  it('says the result is unavailable when the session is unknown', async () => {
    server.use(
      http.get(api('/quiz/s-1/result'), () =>
        HttpResponse.json({ message: 'Сесію тесту не знайдено.' }, { status: 404 }),
      ),
      http.get(api('/quiz/mistake-review'), () =>
        HttpResponse.json({ due: 0, scheduled: 0, cleared: 0, ladder: [] }),
      ),
    );

    openResult();

    expect(await screen.findByText(/Не вдалося знайти результат/)).toBeInTheDocument();
  });
});
