import { HttpResponse, http } from 'msw';
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
    xpEarned: 80,
    completedAt: '2026-09-16T09:00:00.000Z',
  },
  questions: [],
  session: { subjectId: 'subject-1', topicId: null, mode: 'SUBJECT_QUIZ' },
};

const openResult = () =>
  renderScreen(<QuizResultPage />, { path: '/quiz/:sessionId/result', route: '/quiz/s-1/result' });

describe('QuizResultPage', () => {
  it('shows the score of a finished quiz', async () => {
    server.use(http.get(api('/quiz/s-1/result'), () => HttpResponse.json(review)));

    openResult();

    expect(await screen.findByText('80%')).toBeInTheDocument();
    expect(screen.getByText('правильних 4 з 5')).toBeInTheDocument();
  });

  it('explains an unfinished quiz instead of failing', async () => {
    server.use(
      http.get(api('/quiz/s-1/result'), () =>
        HttpResponse.json({ message: 'Ця сесія тесту ще не завершена.' }, { status: 409 }),
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
    );

    openResult();

    expect(await screen.findByText(/Не вдалося знайти результат/)).toBeInTheDocument();
  });
});
