import { apiClient } from '@/lib/api-client';
import type { QuizSessionMetadata } from '@/features/quiz/types/quiz.types';
import type {
  MockExamAttempt,
  MockExamBlock,
  MockExamSpec,
  MockExamTarget,
} from '@/features/mock-exam/types/mock-exam.types';

/**
 * Mock exam endpoints. Thin wrappers over the shared apiClient — no direct
 * Axios, and no reshaping of what the backend returns.
 */
export const mockExamApi = {
  /**
   * POST /quiz/mock-exam/start — a subject or a joint block is the only choice
   * there is. Everything else about a sitting is fixed by the paper, because a
   * mock a student can configure is just a quiz with a longer name.
   */
  async start(target: MockExamTarget): Promise<QuizSessionMetadata> {
    const { data } = await apiClient.post<QuizSessionMetadata>('/quiz/mock-exam/start', target);
    return data;
  },

  /** GET /quiz/mock-exam/spec — the paper's shape, straight from the source. */
  async spec(target: MockExamTarget): Promise<MockExamSpec> {
    const { data } = await apiClient.get<MockExamSpec>('/quiz/mock-exam/spec', { params: target });
    return data;
  },

  /** GET /quiz/mock-exam/blocks — the joint blocks that can be sat now. */
  async blocks(): Promise<MockExamBlock[]> {
    const { data } = await apiClient.get<MockExamBlock[]>('/quiz/mock-exam/blocks');
    return data;
  },

  /** GET /quiz/mock-exam/history — past sittings, oldest first. */
  async history(subjectId?: string): Promise<MockExamAttempt[]> {
    const { data } = await apiClient.get<MockExamAttempt[]>('/quiz/mock-exam/history', {
      params: subjectId ? { subjectId } : undefined,
    });
    return data;
  },
};
