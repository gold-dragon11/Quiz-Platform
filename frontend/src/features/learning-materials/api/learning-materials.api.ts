import { apiClient } from '@/lib/api-client';
import type {
  LearningMaterial,
  LearningMaterialSummary,
} from '@/features/learning-materials/types/learning-materials.types';

/**
 * Public learning material endpoints (docs/04-api/learning-materials.md §4).
 * Read-only, require authentication. Thin wrappers over the shared apiClient.
 */
export const learningMaterialsApi = {
  /** GET /subjects/:subjectId/materials — published materials, no bodies. */
  async listForSubject(subjectId: string): Promise<LearningMaterialSummary[]> {
    const { data } = await apiClient.get<LearningMaterialSummary[]>(`/subjects/${subjectId}/materials`);
    return data;
  },

  /** GET /topics/:topicId/material — the material for one topic, with body. */
  async getForTopic(topicId: string): Promise<LearningMaterial> {
    const { data } = await apiClient.get<LearningMaterial>(`/topics/${topicId}/material`);
    return data;
  },
};
