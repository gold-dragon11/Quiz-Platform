import { useQuery } from '@tanstack/react-query';
import { userApi } from '@/features/user/api/user.api';

/**
 * Server-state queries for the account section (Phase 6.3, decision F9).
 * These render behind RequireAuth, so a session is always established by the
 * time they run.
 */

export const MY_ACCOUNT_QUERY_KEY = ['users', 'me'] as const;
export const MY_AVATAR_QUERY_KEY = ['users', 'me', 'avatar'] as const;

/** The authenticated user's account fields (GET /users/me). */
export function useMyAccount() {
  return useQuery({
    queryKey: MY_ACCOUNT_QUERY_KEY,
    queryFn: () => userApi.getMyAccount(),
    staleTime: 60 * 1000,
  });
}

/** The authenticated user's active avatar (GET /users/me/avatar). */
export function useMyAvatar() {
  return useQuery({
    queryKey: MY_AVATAR_QUERY_KEY,
    queryFn: () => userApi.getMyAvatar(),
    staleTime: 60 * 1000,
  });
}
