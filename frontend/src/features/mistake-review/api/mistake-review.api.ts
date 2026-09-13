import { apiClient } from '@/lib/api-client';
import type { QuizSessionMetadata } from '@/features/quiz/types/quiz.types';
import type {
  MistakeReviewSummary,
  StartMistakeReviewPayload,
} from '@/features/mistake-review/types/mistake-review.types';

/**
 * Mistake review endpoints. Thin wrappers over the shared apiClient — no
 * direct Axios, and no reshaping of what the backend returns.
 */
export const mistakeReviewApi = {
  /** GET /quiz/mistake-review — due / scheduled / cleared. */
  async summary(): Promise<MistakeReviewSummary> {
    const { data } = await apiClient.get<MistakeReviewSummary>('/quiz/mistake-review');
    return data;
  },

  /**
   * POST /quiz/mistake-review/start — today's due mistakes.
   *
   * Nothing due answers 409 with a sentence worth reading, not an empty
   * session: a quiz with no questions is a bug-shaped experience.
   */
  async start(payload: StartMistakeReviewPayload = {}): Promise<QuizSessionMetadata> {
    const { data } = await apiClient.post<QuizSessionMetadata>('/quiz/mistake-review/start', payload);
    return data;
  },
};
