import type { AdminListParams } from '@/features/admin/types/admin.types';

/**
 * Admin query keys. Each entity has a stable prefix so a single
 * `invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.subjects })` refreshes both
 * its list(s) and its lookup after a create/update/delete.
 */
export const ADMIN_QUERY_KEYS = {
  subjects: ['admin', 'subjects'] as const,
  subjectsList: (params: AdminListParams) => ['admin', 'subjects', 'list', params] as const,
  subjectsLookup: ['admin', 'subjects', 'lookup'] as const,

  topics: ['admin', 'topics'] as const,
  topicsList: (params: AdminListParams) => ['admin', 'topics', 'list', params] as const,
  topicsLookup: (subjectId?: string) => ['admin', 'topics', 'lookup', subjectId ?? 'all'] as const,

  questions: ['admin', 'questions'] as const,
  questionsList: (params: AdminListParams) => ['admin', 'questions', 'list', params] as const,

  quizzes: ['admin', 'quizzes'] as const,
  quizzesList: (params: AdminListParams) => ['admin', 'quizzes', 'list', params] as const,
};
