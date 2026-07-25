import { useQueries, useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import { contentApi } from '@/features/subjects/api/content.api';
import type { PublicTopic } from '@/features/subjects/types/subjects.types';

/**
 * Content queries for the browser (Phase 6.7, decision F9). Keys share the
 * `content` namespace used by the quiz feature, so subjects/topics are reused
 * from cache across features (no refetch). Topics are fetched per subject in
 * parallel via useQueries and cached per subject — powering both the card
 * topic counts and instant topic-name search without extra requests when a
 * subject is opened.
 */

export const CONTENT_QUERY_KEYS = {
  subjects: ['content', 'subjects'] as const,
  topics: (subjectId: string) => ['content', 'topics', subjectId] as const,
};

const TOPICS_STALE_TIME = 5 * 60 * 1000;

export function useSubjects() {
  return useQuery({
    queryKey: CONTENT_QUERY_KEYS.subjects,
    queryFn: () => contentApi.listSubjects(),
    staleTime: TOPICS_STALE_TIME,
  });
}

/** Parallel per-subject topics queries, indexed to the given subject ids. */
export function useAllSubjectTopics(subjectIds: string[]): UseQueryResult<PublicTopic[]>[] {
  return useQueries({
    queries: subjectIds.map((subjectId) => ({
      queryKey: CONTENT_QUERY_KEYS.topics(subjectId),
      queryFn: () => contentApi.listTopics(subjectId),
      staleTime: TOPICS_STALE_TIME,
    })),
  });
}
