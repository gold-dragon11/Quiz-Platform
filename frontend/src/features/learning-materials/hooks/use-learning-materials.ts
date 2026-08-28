import { useQuery } from '@tanstack/react-query';
import { learningMaterialsApi } from '@/features/learning-materials/api/learning-materials.api';
import type { LearningMaterialSummary } from '@/features/learning-materials/types/learning-materials.types';

/**
 * Material queries. Content changes rarely — only when an editor republishes
 * it — so both queries are cached long enough that moving between topics and
 * back does not refetch.
 */

export const MATERIAL_QUERY_KEYS = {
  forSubject: (subjectId: string) => ['materials', 'subject', subjectId] as const,
  forTopic: (topicId: string) => ['materials', 'topic', topicId] as const,
};

const MATERIAL_STALE_TIME = 10 * 60 * 1000;

/**
 * Materials of one subject, keyed by topic id.
 *
 * Returned as a Map so a topic list can ask "does this topic have a material?"
 * without a request per topic. `enabled` guards the empty id used before a
 * subject is chosen.
 */
export function useSubjectMaterials(subjectId: string | undefined) {
  return useQuery({
    queryKey: MATERIAL_QUERY_KEYS.forSubject(subjectId ?? ''),
    queryFn: () => learningMaterialsApi.listForSubject(subjectId ?? ''),
    enabled: Boolean(subjectId),
    staleTime: MATERIAL_STALE_TIME,
    select: (materials: LearningMaterialSummary[]) =>
      new Map(
        materials
          .filter((material) => material.topicId !== null)
          .map((material) => [material.topicId as string, material]),
      ),
  });
}

/**
 * The material for one topic. A topic without one answers 404, which is a
 * normal outcome here rather than a failure — callers render an empty state.
 * Not retried for that reason: a missing material will not appear on a retry.
 */
export function useTopicMaterial(topicId: string) {
  return useQuery({
    queryKey: MATERIAL_QUERY_KEYS.forTopic(topicId),
    queryFn: () => learningMaterialsApi.getForTopic(topicId),
    enabled: Boolean(topicId),
    staleTime: MATERIAL_STALE_TIME,
    retry: false,
  });
}
