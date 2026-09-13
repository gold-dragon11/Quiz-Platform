import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminUsersApi } from '@/features/admin/api/admin.api';
import { ADMIN_QUERY_KEYS } from '@/features/admin/hooks/query-keys';
import type { AdminListParams, AssignableRole } from '@/features/admin/types/admin.types';

export function useAdminUsers(params: AdminListParams) {
  return useQuery({
    queryKey: ADMIN_QUERY_KEYS.usersList(params),
    queryFn: () => adminUsersApi.list(params),
    placeholderData: keepPreviousData,
  });
}

export function useSetUserRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { userId: string; role: AssignableRole }) =>
      adminUsersApi.setRole(vars.userId, vars.role),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.users }),
  });
}
