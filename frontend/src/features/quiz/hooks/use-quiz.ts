import { useEffect, useMemo, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { quizApi } from '@/features/quiz/api/quiz.api';
import { createAnswerSaver, type AnswerSaver, type SaveStatus } from '@/features/quiz/lib/answer-saver';
import type { SelectedAnswer, StartQuizPayload } from '@/features/quiz/types/quiz.types';

/**
 * Quiz engine queries + mutations (Phase 6.5). React Query owns all server
 * state; components hold only transient UI state. Completing a quiz
 * invalidates statistics so the statistics views reflect it immediately.
 */

export const QUIZ_QUERY_KEYS = {
  session: (sessionId: string) => ['quiz', 'session', sessionId] as const,
  result: (sessionId: string) => ['quiz', 'result', sessionId] as const,
  active: ['quiz', 'active'] as const,
  available: (subjectId: string, topicId: string) => ['quiz', 'available', subjectId, topicId] as const,
};

/**
 * Size of the pool a quiz over these filters would draw from.
 *
 * Disabled until a subject is chosen, because that is the one required filter
 * — asking earlier would send a request that can only 400.
 */
export function useAvailableQuestions(subjectId: string, topicId: string) {
  return useQuery({
    queryKey: QUIZ_QUERY_KEYS.available(subjectId, topicId),
    queryFn: () => quizApi.getAvailable({ subjectId, topicId: topicId || undefined }),
    enabled: Boolean(subjectId),
    staleTime: 60 * 1000,
  });
}

/**
 * The user's in-progress session, if any. Shared by the Quiz Start form
 * (offers a way back into it instead of a dead-end 409) and the dashboard
 * (a proactive "continue" card) — one query, one cache entry, so starting or
 * finishing a quiz in one place updates the other without a refetch.
 */
export function useActiveQuiz() {
  return useQuery({
    queryKey: QUIZ_QUERY_KEYS.active,
    queryFn: () => quizApi.getActive(),
  });
}

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
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: StartQuizPayload) => quizApi.start(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUIZ_QUERY_KEYS.active });
    },
  });
}

/**
 * Autosave for the quiz runtime: one request per question at a time, newest
 * value last (lib/answer-saver.ts). The callbacks are read through a ref, so a
 * re-render never rebuilds the queue and drops what is waiting in it.
 */
export function useAnswerSaver(
  sessionId: string,
  callbacks: { onStatus: (status: SaveStatus) => void; onError: (error: unknown) => void },
): AnswerSaver {
  const callbacksRef = useRef(callbacks);
  useEffect(() => {
    callbacksRef.current = callbacks;
  });

  const saver = useMemo(
    () =>
      createAnswerSaver({
        send: (questionId, answer: SelectedAnswer) => quizApi.submitAnswer(sessionId, questionId, answer),
        onStatus: (status) => callbacksRef.current.onStatus(status),
        onError: (error) => callbacksRef.current.onError(error),
      }),
    [sessionId],
  );

  // Leaving the page sends whatever is still waiting instead of dropping it.
  useEffect(() => () => void saver.flush(), [saver]);

  return saver;
}

export function useCompleteQuiz(sessionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => quizApi.complete(sessionId),
    onSuccess: () => {
      // New progress and activity: refresh statistics-backed views.
      void queryClient.invalidateQueries({ queryKey: ['statistics'] });
      // The session just left ACTIVE — drop the stale "continue" card/banner.
      void queryClient.invalidateQueries({ queryKey: QUIZ_QUERY_KEYS.active });
    },
  });
}
