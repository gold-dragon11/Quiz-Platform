import { useQuery } from '@tanstack/react-query';
import { statisticsApi } from '@/features/statistics/api/statistics.api';

/**
 * Statistics server-state queries (Phase 6.6, decision F9). React Query fires
 * them in parallel; the query keys share the `statistics` namespace used by
 * the dashboard, so the overall/subjects data is reused from cache when the
 * user arrives from the dashboard (no refetch). The recent list uses a larger
 * page size than the dashboard preview, so it is a distinct key.
 */

const RECENT_PAGE_SIZE = 10;

export const STATISTICS_QUERY_KEYS = {
  overall: ['statistics', 'overall'] as const,
  subjects: ['statistics', 'subjects'] as const,
  recent: (pageSize: number) => ['statistics', 'recent', { pageSize }] as const,
};

export function useOverallStatistics() {
  return useQuery({
    queryKey: STATISTICS_QUERY_KEYS.overall,
    queryFn: () => statisticsApi.getOverall(),
    staleTime: 30 * 1000,
  });
}

export function useSubjectStatistics() {
  return useQuery({
    queryKey: STATISTICS_QUERY_KEYS.subjects,
    queryFn: () => statisticsApi.getSubjects(),
    staleTime: 30 * 1000,
  });
}

export function useRecentActivity(pageSize = RECENT_PAGE_SIZE) {
  return useQuery({
    queryKey: STATISTICS_QUERY_KEYS.recent(pageSize),
    queryFn: () => statisticsApi.getRecent(pageSize),
    staleTime: 30 * 1000,
  });
}
