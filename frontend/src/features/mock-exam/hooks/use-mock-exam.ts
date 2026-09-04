import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { mockExamApi } from '@/features/mock-exam/api/mock-exam.api';
import { QUIZ_QUERY_KEYS } from '@/features/quiz/hooks/use-quiz';

/**
 * Mock exam queries + mutations. Starting a sitting invalidates the shared
 * `quiz.active` entry so the dashboard banner and the quiz start page learn
 * about the new session without a manual refetch — a mock occupies the same
 * single-active-session slot as ordinary practice.
 */

export const MOCK_EXAM_QUERY_KEYS = {
  spec: (subjectId: string) => ['mock-exam', 'spec', subjectId] as const,
  history: (subjectId?: string) => ['mock-exam', 'history', subjectId ?? 'all'] as const,
};

/** Disabled until a subject is chosen — the paper is defined per subject. */
export function useMockExamSpec(subjectId: string | undefined) {
  return useQuery({
    queryKey: MOCK_EXAM_QUERY_KEYS.spec(subjectId ?? ''),
    queryFn: () => mockExamApi.spec(subjectId as string),
    enabled: Boolean(subjectId),
    staleTime: 5 * 60 * 1000,
  });
}

export function useMockExamHistory(subjectId?: string) {
  return useQuery({
    queryKey: MOCK_EXAM_QUERY_KEYS.history(subjectId),
    queryFn: () => mockExamApi.history(subjectId),
  });
}

export function useStartMockExam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (subjectId: string) => mockExamApi.start(subjectId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUIZ_QUERY_KEYS.active });
    },
  });
}
