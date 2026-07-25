import { apiClient } from '@/lib/api-client';
import type { PublicSubject, PublicTopic } from '@/features/subjects/types/subjects.types';

/**
 * Public content endpoints for the browser (docs/04-api/questions.md §4).
 * Read-only, require authentication. Thin wrappers over the shared apiClient —
 * no direct Axios. Only these two endpoints are used.
 */
export const contentApi = {
  /** GET /subjects — all published subjects, displayOrder ascending. */
  async listSubjects(): Promise<PublicSubject[]> {
    const { data } = await apiClient.get<PublicSubject[]>('/subjects');
    return data;
  },

  /** GET /subjects/:subjectId/topics — published topics of a subject. */
  async listTopics(subjectId: string): Promise<PublicTopic[]> {
    const { data } = await apiClient.get<PublicTopic[]>(`/subjects/${subjectId}/topics`);
    return data;
  },
};
