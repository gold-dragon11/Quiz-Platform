import { useQuery } from '@tanstack/react-query';
import { adminSubjectsApi, adminTopicsApi } from '@/features/admin/api/admin.api';
import { ADMIN_QUERY_KEYS } from '@/features/admin/hooks/query-keys';

/**
 * Lightweight lookups for filter dropdowns and id→name resolution in tables.
 * They page-cap at 100 (the backend maximum), enough for the MVP content
 * catalog, and are cached under each entity's prefix so they refresh with it.
 */
const LOOKUP_PAGE_SIZE = 100;

export function useSubjectsLookup() {
  return useQuery({
    queryKey: ADMIN_QUERY_KEYS.subjectsLookup,
    queryFn: () => adminSubjectsApi.list({ pageSize: LOOKUP_PAGE_SIZE }),
    staleTime: 60 * 1000,
    select: (data) => data.items,
  });
}

export function useTopicsLookup(subjectId?: string) {
  return useQuery({
    queryKey: ADMIN_QUERY_KEYS.topicsLookup(subjectId),
    queryFn: () => adminTopicsApi.list({ pageSize: LOOKUP_PAGE_SIZE, subjectId }),
    staleTime: 60 * 1000,
    select: (data) => data.items,
  });
}
