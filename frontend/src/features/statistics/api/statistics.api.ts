import { apiClient } from '@/lib/api-client';
import type { Paginated } from '@/shared/types/api';
import type {
  MistakeGroup,
  OverallStatistics,
  RecentActivityItem,
  SubjectStatistics,
  TopicStatistics,
} from '@/features/statistics/types/statistics.types';

/**
 * Statistics API layer (Phase 6.6) — typed wrappers over the shared apiClient
 * for the read-only Statistics endpoints (docs/04-api/statistics.md). No
 * feature touches Axios directly. Deferred endpoints (trends) are not used.
 *
 * `/statistics/progress` is deliberately not wrapped: every field it returns
 * (level, XP, completion) is already in the `/statistics` payload, and a second
 * request for the same numbers is how two views of one fact start to disagree.
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

  /** GET /statistics/topics — per-topic statistics across every subject (§6). */
  async getTopics(): Promise<TopicStatistics[]> {
    const { data } = await apiClient.get<TopicStatistics[]>('/statistics/topics');
    return data;
  },

  /** GET /statistics/mistakes — topics still answered wrong (§8a). */
  async getMistakes(): Promise<MistakeGroup[]> {
    const { data } = await apiClient.get<MistakeGroup[]>('/statistics/mistakes');
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
