import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { mockExamApi } from '@/features/mock-exam/api/mock-exam.api';
import type { MockExamTarget } from '@/features/mock-exam/types/mock-exam.types';
import { QUIZ_QUERY_KEYS } from '@/features/quiz/hooks/use-quiz';

/**
 * Mock exam queries + mutations. Starting a sitting invalidates the shared
 * `quiz.active` entry so the dashboard banner and the quiz start page learn
 * about the new session without a manual refetch — a mock occupies the same
 * single-active-session slot as ordinary practice.
 */

const targetKey = (target: MockExamTarget): string =>
  'block' in target ? `block:${target.block}` : `subject:${target.subjectId}`;

export const MOCK_EXAM_QUERY_KEYS = {
  spec: (target: MockExamTarget | undefined) =>
    ['mock-exam', 'spec', target ? targetKey(target) : 'none'] as const,
  blocks: ['mock-exam', 'blocks'] as const,
  history: (subjectId?: string) => ['mock-exam', 'history', subjectId ?? 'all'] as const,
};

/** Disabled until a subject or a block is chosen — the paper is defined per choice. */
export function useMockExamSpec(target: MockExamTarget | undefined) {
  return useQuery({
    queryKey: MOCK_EXAM_QUERY_KEYS.spec(target),
    queryFn: () => mockExamApi.spec(target as MockExamTarget),
    enabled: target !== undefined,
    staleTime: 5 * 60 * 1000,
  });
}

export function useMockExamBlocks() {
  return useQuery({
    queryKey: MOCK_EXAM_QUERY_KEYS.blocks,
    queryFn: () => mockExamApi.blocks(),
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
    mutationFn: (target: MockExamTarget) => mockExamApi.start(target),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUIZ_QUERY_KEYS.active });
    },
  });
}
