import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CURRENT_USER_QUERY_KEY } from '@/shared/hooks/use-current-user';
import { isApiError } from '@/shared/utils/apply-api-error';
import { userApi } from '@/features/user/api/user.api';

export const publicProfileQueryKey = (username: string) => ['users', 'public', username] as const;

/**
 * Somebody's public profile. A 404 is an answer, not a hiccup — the profile
 * is unknown or hidden — so it is not retried.
 */
export function usePublicProfile(username: string) {
  return useQuery({
    queryKey: publicProfileQueryKey(username),
    queryFn: () => userApi.getPublicProfile(username),
    enabled: username !== '',
    retry: (failures, error) => !(isApiError(error) && error.status === 404) && failures < 2,
  });
}

/**
 * Turns the public profile on or off.
 *
 * The switch reads `/auth/me`, so that is what refetches. The reader's own
 * public page is dropped from the cache too: after hiding it, opening the link
 * must show what a stranger now sees, not the copy cached a minute ago.
 */
export function useSetPublicProfileEnabled(username: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (enabled: boolean) => userApi.setPublicProfileEnabled(enabled),
    onSuccess: async () => {
      if (username) {
        queryClient.removeQueries({ queryKey: publicProfileQueryKey(username) });
      }
      await queryClient.invalidateQueries({ queryKey: CURRENT_USER_QUERY_KEY });
    },
  });
}
