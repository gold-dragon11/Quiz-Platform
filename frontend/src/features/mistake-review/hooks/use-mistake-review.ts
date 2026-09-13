import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { mistakeReviewApi } from '@/features/mistake-review/api/mistake-review.api';
import type { StartMistakeReviewPayload } from '@/features/mistake-review/types/mistake-review.types';
import { QUIZ_QUERY_KEYS } from '@/features/quiz/hooks/use-quiz';

/**
 * Mistake review queries + mutations.
 *
 * The summary is shared by the review page and the dashboard card, so both
 * read one cache entry: starting a review in one place updates the count in
 * the other without a refetch.
 */

export const MISTAKE_REVIEW_QUERY_KEYS = {
  summary: ['mistake-review', 'summary'] as const,
};

export function useMistakeReviewSummary() {
  return useQuery({
    queryKey: MISTAKE_REVIEW_QUERY_KEYS.summary,
    queryFn: () => mistakeReviewApi.summary(),
    staleTime: 60 * 1000,
  });
}

export function useStartMistakeReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: StartMistakeReviewPayload = {}) => mistakeReviewApi.start(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUIZ_QUERY_KEYS.active });
      void queryClient.invalidateQueries({ queryKey: MISTAKE_REVIEW_QUERY_KEYS.summary });
    },
  });
}
