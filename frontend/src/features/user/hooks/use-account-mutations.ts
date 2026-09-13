import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CURRENT_USER_QUERY_KEY } from '@/shared/hooks/use-current-user';
import { userApi } from '@/features/user/api/user.api';
import type { ChangePasswordPayload, UpdateProfilePayload } from '@/features/user/types/user.types';

/**
 * Account mutations (Phase 6.3). Password change and deletion both hit
 * endpoints that revoke refresh sessions server-side; per-screen UX (toasts,
 * navigation, cache/session teardown on delete) is owned by the components.
 */

/**
 * Updates the display name and bio, then refetches the session summary.
 *
 * `/auth/me` is where the rest of the app reads the reader's name — the
 * sidebar, the dashboard greeting — so without this invalidation the profile
 * page would show the new name while every other screen kept the old one
 * until the next reload.
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateProfilePayload) => userApi.updateProfile(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CURRENT_USER_QUERY_KEY }),
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (payload: ChangePasswordPayload) => userApi.changePassword(payload),
  });
}

export function useDeleteAccount() {
  return useMutation({
    mutationFn: () => userApi.deleteAccount(),
  });
}
