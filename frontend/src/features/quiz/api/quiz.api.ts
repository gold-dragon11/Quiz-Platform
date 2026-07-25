import { apiClient } from '@/lib/api-client';
import type {
  QuizResultSummary,
  QuizResumeView,
  QuizReview,
  QuizSessionMetadata,
  SelectedAnswer,
  StartQuizPayload,
} from '@/features/quiz/types/quiz.types';

/**
 * Quiz engine endpoints (docs/04-api/quiz.md). Thin wrappers over the shared
 * apiClient — no direct Axios. Every route is scoped to the authenticated
 * user by the backend; a foreign/unknown session is 404.
 */
export const quizApi = {
  /** POST /quiz/start — creates an ACTIVE session (§4). */
  async start(payload: StartQuizPayload): Promise<QuizSessionMetadata> {
    const { data } = await apiClient.post<QuizSessionMetadata>('/quiz/start', payload);
    return data;
  },

  /** GET /quiz/:sessionId — resume state: session, questions, saved answers (§9). */
  async getSession(sessionId: string): Promise<QuizResumeView> {
    const { data } = await apiClient.get<QuizResumeView>(`/quiz/${sessionId}`);
    return data;
  },

  /**
   * POST /quiz/:sessionId/answers — saves/updates an answer (§6). Note the
   * endpoint is `/answers` (plural); the echo carries no correctness.
   */
  async submitAnswer(
    sessionId: string,
    questionId: string,
    selectedAnswer: SelectedAnswer,
  ): Promise<{ questionId: string; selectedAnswer: SelectedAnswer }> {
    const { data } = await apiClient.post<{
      questionId: string;
      selectedAnswer: SelectedAnswer;
    }>(`/quiz/${sessionId}/answers`, { questionId, selectedAnswer });
    return data;
  },

  /** POST /quiz/:sessionId/complete — finalizes and scores (§7). */
  async complete(sessionId: string): Promise<QuizResultSummary> {
    const { data } = await apiClient.post<QuizResultSummary>(`/quiz/${sessionId}/complete`);
    return data;
  },

  /** GET /quiz/:sessionId/result — full post-completion review (§8). */
  async getResult(sessionId: string): Promise<QuizReview> {
    const { data } = await apiClient.get<QuizReview>(`/quiz/${sessionId}/result`);
    return data;
  },
};
