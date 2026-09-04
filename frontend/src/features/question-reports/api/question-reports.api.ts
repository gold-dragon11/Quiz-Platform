import { apiClient } from '@/lib/api-client';
import type {
  CreateReportPayload,
  QuestionReportView,
} from '@/features/question-reports/types/question-report.types';

/** Question report endpoints. Thin wrappers over the shared apiClient. */
export const questionReportsApi = {
  /**
   * POST /questions/:questionId/report.
   *
   * Reporting the same question twice while the first report is still open
   * answers 409 with a sentence worth showing verbatim — it is a reassurance
   * ("Ми розберемося"), not an error the UI should dress up.
   */
  async report(questionId: string, payload: CreateReportPayload): Promise<QuestionReportView> {
    const { data } = await apiClient.post<QuestionReportView>(`/questions/${questionId}/report`, payload);
    return data;
  },
};
