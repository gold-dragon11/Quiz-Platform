import { useQuery } from '@tanstack/react-query';
import { adminMetricsApi } from '@/features/admin/api/admin.api';
import { ADMIN_QUERY_KEYS } from '@/features/admin/hooks/query-keys';

/** A minute: the numbers move slowly, and the page is opened to read, not to watch. */
const STALE_MS = 60_000;

export function useAdminMetrics() {
  return useQuery({
    queryKey: ADMIN_QUERY_KEYS.metrics,
    queryFn: () => adminMetricsApi.overview(),
    staleTime: STALE_MS,
  });
}
