import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminSubjectsApi } from '@/features/admin/api/admin.api';
import { ADMIN_QUERY_KEYS } from '@/features/admin/hooks/query-keys';
import type {
  AdminListParams,
  CreateSubjectPayload,
  UpdateSubjectPayload,
} from '@/features/admin/types/admin.types';

export function useAdminSubjects(params: AdminListParams) {
  return useQuery({
    queryKey: ADMIN_QUERY_KEYS.subjectsList(params),
    queryFn: () => adminSubjectsApi.list(params),
    placeholderData: keepPreviousData,
  });
}

export function useCreateSubject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateSubjectPayload) => adminSubjectsApi.create(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.subjects }),
  });
}

export function useUpdateSubject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; payload: UpdateSubjectPayload }) =>
      adminSubjectsApi.update(vars.id, vars.payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.subjects }),
  });
}

export function useDeleteSubject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminSubjectsApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.subjects }),
  });
}
