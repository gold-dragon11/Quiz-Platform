import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminQuestionsApi } from '@/features/admin/api/admin.api';
import { ADMIN_QUERY_KEYS } from '@/features/admin/hooks/query-keys';
import type {
  AdminListParams,
  CreateQuestionPayload,
  UpdateQuestionPayload,
} from '@/features/admin/types/admin.types';

export function useAdminQuestions(params: AdminListParams) {
  return useQuery({
    queryKey: ADMIN_QUERY_KEYS.questionsList(params),
    queryFn: () => adminQuestionsApi.list(params),
    placeholderData: keepPreviousData,
  });
}

export function useCreateQuestion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateQuestionPayload) => adminQuestionsApi.create(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.questions }),
  });
}

export function useUpdateQuestion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; payload: UpdateQuestionPayload }) =>
      adminQuestionsApi.update(vars.id, vars.payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.questions }),
  });
}

export function usePublishQuestion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; isPublished: boolean }) =>
      adminQuestionsApi.publish(vars.id, vars.isPublished),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.questions }),
  });
}

export function useDeleteQuestion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminQuestionsApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.questions }),
  });
}
