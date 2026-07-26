import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminQuizzesApi } from '@/features/admin/api/admin.api';
import { ADMIN_QUERY_KEYS } from '@/features/admin/hooks/query-keys';
import type {
  AdminListParams,
  CreateQuizPayload,
  UpdateQuizPayload,
} from '@/features/admin/types/admin.types';

export function useAdminQuizzes(params: AdminListParams) {
  return useQuery({
    queryKey: ADMIN_QUERY_KEYS.quizzesList(params),
    queryFn: () => adminQuizzesApi.list(params),
    placeholderData: keepPreviousData,
  });
}

export function useCreateQuiz() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateQuizPayload) => adminQuizzesApi.create(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.quizzes }),
  });
}

export function useUpdateQuiz() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; payload: UpdateQuizPayload }) =>
      adminQuizzesApi.update(vars.id, vars.payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.quizzes }),
  });
}

export function useDeleteQuiz() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminQuizzesApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.quizzes }),
  });
}
