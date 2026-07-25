import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { quizApi } from '@/features/quiz/api/quiz.api';
import type { SelectedAnswer, StartQuizPayload } from '@/features/quiz/types/quiz.types';

/**
 * Quiz engine queries + mutations (Phase 6.5). React Query owns all server
 * state; components hold only transient UI state. Completing a quiz
 * invalidates statistics so the dashboard reflects new XP/level immediately.
 */

export const QUIZ_QUERY_KEYS = {
  session: (sessionId: string) => ['quiz', 'session', sessionId] as const,
  result: (sessionId: string) => ['quiz', 'result', sessionId] as const,
};

/** Resume/session state; not retried so a 404 surfaces its empty state fast. */
export function useQuizSession(sessionId: string) {
  return useQuery({
    queryKey: QUIZ_QUERY_KEYS.session(sessionId),
    queryFn: () => quizApi.getSession(sessionId),
    retry: false,
    staleTime: 0,
  });
}

/** Post-completion review; not retried so a 404/409 surfaces its empty state. */
export function useQuizResult(sessionId: string) {
  return useQuery({
    queryKey: QUIZ_QUERY_KEYS.result(sessionId),
    queryFn: () => quizApi.getResult(sessionId),
    retry: false,
    staleTime: 60 * 1000,
  });
}

export function useStartQuiz() {
  return useMutation({
    mutationFn: (payload: StartQuizPayload) => quizApi.start(payload),
  });
}

export function useSubmitAnswer(sessionId: string) {
  return useMutation({
    mutationFn: (vars: { questionId: string; selectedAnswer: SelectedAnswer }) =>
      quizApi.submitAnswer(sessionId, vars.questionId, vars.selectedAnswer),
  });
}

export function useCompleteQuiz(sessionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => quizApi.complete(sessionId),
    onSuccess: () => {
      // New XP/level/activity — refresh statistics-backed views (dashboard).
      void queryClient.invalidateQueries({ queryKey: ['statistics'] });
    },
  });
}
