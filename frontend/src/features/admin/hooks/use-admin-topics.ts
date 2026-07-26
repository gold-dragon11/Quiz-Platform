import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminTopicsApi } from '@/features/admin/api/admin.api';
import { ADMIN_QUERY_KEYS } from '@/features/admin/hooks/query-keys';
import type {
  AdminListParams,
  CreateTopicPayload,
  UpdateTopicPayload,
} from '@/features/admin/types/admin.types';

export function useAdminTopics(params: AdminListParams) {
  return useQuery({
    queryKey: ADMIN_QUERY_KEYS.topicsList(params),
    queryFn: () => adminTopicsApi.list(params),
    placeholderData: keepPreviousData,
  });
}

export function useCreateTopic() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTopicPayload) => adminTopicsApi.create(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.topics }),
  });
}

export function useUpdateTopic() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; payload: UpdateTopicPayload }) =>
      adminTopicsApi.update(vars.id, vars.payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.topics }),
  });
}

export function useDeleteTopic() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminTopicsApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.topics }),
  });
}
