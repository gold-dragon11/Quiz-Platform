import { useQuery } from '@tanstack/react-query';
import { contentApi } from '@/features/quiz/api/content.api';

/**
 * Content queries for the quiz start page (Phase 6.5). Subjects load on mount;
 * topics load only once a subject is chosen (the query is disabled until then).
 */

export const CONTENT_QUERY_KEYS = {
  subjects: ['content', 'subjects'] as const,
  topics: (subjectId: string) => ['content', 'topics', subjectId] as const,
};

export function useSubjects() {
  return useQuery({
    queryKey: CONTENT_QUERY_KEYS.subjects,
    queryFn: () => contentApi.listSubjects(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useTopics(subjectId: string | undefined) {
  return useQuery({
    queryKey: CONTENT_QUERY_KEYS.topics(subjectId ?? ''),
    queryFn: () => contentApi.listTopics(subjectId as string),
    enabled: Boolean(subjectId),
    staleTime: 5 * 60 * 1000,
  });
}
