import { apiClient } from '@/lib/api-client';
import type { Paginated } from '@/shared/types/api';
import type {
  OverallStatistics,
  RecentActivityItem,
  SubjectStatistics,
} from '@/features/statistics/types/statistics.types';

/**
 * Statistics API layer (Phase 6.6) — typed wrappers over the shared apiClient
 * for the read-only Statistics endpoints (docs/04-api/statistics.md). No
 * feature touches Axios directly. Deferred endpoints (trends) are not used.
 */
export const statisticsApi = {
  /** GET /statistics — overall statistics + level block (§4). */
  async getOverall(): Promise<OverallStatistics> {
    const { data } = await apiClient.get<OverallStatistics>('/statistics');
    return data;
  },

  /** GET /statistics/subjects — per-subject statistics; empty until a quiz is done (§5). */
  async getSubjects(): Promise<SubjectStatistics[]> {
    const { data } = await apiClient.get<SubjectStatistics[]>('/statistics/subjects');
    return data;
  },

  /** GET /statistics/recent — newest completed sessions, paginated (§8). */
  async getRecent(pageSize: number): Promise<Paginated<RecentActivityItem>> {
    const { data } = await apiClient.get<Paginated<RecentActivityItem>>('/statistics/recent', {
      params: { page: 1, pageSize },
    });
    return data;
  },
};
