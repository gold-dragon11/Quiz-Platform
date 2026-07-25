import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authService } from '@/services/auth-service';
import { CURRENT_USER_QUERY_KEY } from '@/shared/hooks/use-current-user';
import type { LoginFormValues } from '@/features/auth/validation/auth.schemas';
import {
  authApi,
  type ForgotPasswordPayload,
  type RegisterPayload,
  type ResendVerificationPayload,
  type ResetPasswordPayload,
  type VerifyEmailPayload,
} from '@/features/auth/api/auth.api';

/**
 * TanStack Query mutations for every auth action (Phase 6.2). All server
 * communication goes through these; components own the per-screen UX
 * (navigation, toasts, success panels) and error handling. Session mutations
 * delegate to services/auth-service (F5); the rest hit the feature API layer.
 */

/** Authenticates and, on success, refreshes the cached `/auth/me` session. */
export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: LoginFormValues) => authService.login(values),
    onSuccess: () => {
      // The session identity changed — drop any stale cached user so the
      // guard/app shell refetch the freshly authenticated one.
      void queryClient.invalidateQueries({ queryKey: CURRENT_USER_QUERY_KEY });
    },
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: (payload: RegisterPayload) => authApi.register(payload),
  });
}

export function useVerifyEmail() {
  return useMutation({
    mutationFn: (payload: VerifyEmailPayload) => authApi.verifyEmail(payload),
  });
}

export function useResendVerification() {
  return useMutation({
    mutationFn: (payload: ResendVerificationPayload) => authApi.resendVerification(payload),
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (payload: ForgotPasswordPayload) => authApi.forgotPassword(payload),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (payload: ResetPasswordPayload) => authApi.resetPassword(payload),
  });
}
