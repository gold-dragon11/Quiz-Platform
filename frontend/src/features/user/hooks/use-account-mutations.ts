import { useMutation } from '@tanstack/react-query';
import { userApi } from '@/features/user/api/user.api';
import type { ChangePasswordPayload } from '@/features/user/types/user.types';

/**
 * Account mutations (Phase 6.3). Both hit endpoints that revoke refresh
 * sessions server-side; per-screen UX (toasts, navigation, cache/session
 * teardown on delete) is owned by the components.
 */

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
