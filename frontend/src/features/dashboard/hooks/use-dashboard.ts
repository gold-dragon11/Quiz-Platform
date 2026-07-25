import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/features/dashboard/api/dashboard.api';

/**
 * Dashboard server-state queries (Phase 6.4, decision F9). Each section calls
 * the hook it needs; React Query fires them in parallel and dedupes shared
 * keys (the overall query powers both the hero and the stats summary from a
 * single request), satisfying the dashboard's parallel-fetch performance goal
 * (docs/01-prd/dashboard.md §13).
 */

const RECENT_ACTIVITY_PAGE_SIZE = 5;

export const DASHBOARD_QUERY_KEYS = {
  overall: ['statistics', 'overall'] as const,
  subjects: ['statistics', 'subjects'] as const,
  recent: (pageSize: number) => ['statistics', 'recent', { pageSize }] as const,
};

export function useOverallStatistics() {
  return useQuery({
    queryKey: DASHBOARD_QUERY_KEYS.overall,
    queryFn: () => dashboardApi.getOverallStatistics(),
    staleTime: 30 * 1000,
  });
}

export function useSubjectStatistics() {
  return useQuery({
    queryKey: DASHBOARD_QUERY_KEYS.subjects,
    queryFn: () => dashboardApi.getSubjectStatistics(),
    staleTime: 30 * 1000,
  });
}

export function useRecentActivity(pageSize = RECENT_ACTIVITY_PAGE_SIZE) {
  return useQuery({
    queryKey: DASHBOARD_QUERY_KEYS.recent(pageSize),
    queryFn: () => dashboardApi.getRecentActivity(pageSize),
    staleTime: 30 * 1000,
  });
}
