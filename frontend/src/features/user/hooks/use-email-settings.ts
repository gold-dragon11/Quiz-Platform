import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { userApi } from '@/features/user/api/user.api';
import type { EmailSettings } from '@/features/user/types/user.types';

export const EMAIL_SETTINGS_QUERY_KEY = ['users', 'me', 'settings', 'email'] as const;

/** The two email switches. Not for the demo account, whose settings are closed. */
export function useEmailSettings(enabled = true) {
  return useQuery({
    queryKey: EMAIL_SETTINGS_QUERY_KEY,
    queryFn: () => userApi.getEmailSettings(),
    enabled,
  });
}

/** Changes one or both; the answer replaces the cached pair. */
export function useUpdateEmailSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<EmailSettings>) => userApi.updateEmailSettings(patch),
    onSuccess: (settings) => {
      queryClient.setQueryData(EMAIL_SETTINGS_QUERY_KEY, settings);
    },
  });
}
