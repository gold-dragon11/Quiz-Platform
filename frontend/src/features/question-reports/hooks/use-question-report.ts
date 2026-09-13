import { useMutation } from '@tanstack/react-query';
import { questionReportsApi } from '@/features/question-reports/api/question-reports.api';
import type { CreateReportPayload } from '@/features/question-reports/types/question-report.types';

/**
 * Reporting a question is fire-and-forget from the client's side: nothing the
 * learner can see changes, so there is no query to invalidate. The review
 * queue is an administrator's screen.
 */
export function useReportQuestion(questionId: string) {
  return useMutation({
    mutationFn: (payload: CreateReportPayload) => questionReportsApi.report(questionId, payload),
  });
}
