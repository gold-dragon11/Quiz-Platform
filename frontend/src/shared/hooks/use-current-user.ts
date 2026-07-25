import { useQuery } from '@tanstack/react-query';
import { authService } from '@/services/auth-service';
import { useAuthStore } from '@/stores/auth-store';
import type { CurrentUser } from '@/shared/types/auth';

/** Query key for the authenticated session summary. */
export const CURRENT_USER_QUERY_KEY = ['auth', 'me'] as const;

/**
 * The authenticated user's session summary (server state, decision F9). Runs
 * only once the auth store reports an authenticated session, so it never
 * fires an unauthenticated request. Guards and the app shell read the role
 * and identity from here — the user object is never duplicated into Zustand.
 */
export function useCurrentUser() {
  const status = useAuthStore((state) => state.status);

  return useQuery<CurrentUser>({
    queryKey: CURRENT_USER_QUERY_KEY,
    queryFn: () => authService.getCurrentUser(),
    enabled: status === 'authenticated',
    staleTime: 5 * 60 * 1000,
  });
}
