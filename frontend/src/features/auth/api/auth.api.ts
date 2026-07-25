import { apiClient } from '@/lib/api-client';
import type { Language } from '@/shared/types/enums';

/**
 * Auth feature API layer — thin, typed wrappers over the shared apiClient for
 * the auth endpoints that do NOT establish a session (docs/04-api/
 * authentication.md §4/§5/§9/§10). Session-establishing calls (login, logout,
 * refresh, /auth/me) live in the app-wide services/auth-service per Phase 6.1
 * decision F5. No feature ever touches Axios directly.
 *
 * Every endpoint below returns an empty body on success, by design, so these
 * resolve to `void`.
 */

export interface RegisterPayload {
  email: string;
  password: string;
  username: string;
  preferredLanguage?: Language;
}

export interface VerifyEmailPayload {
  token: string;
}

export interface ResendVerificationPayload {
  email: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  token: string;
  newPassword: string;
}

export const authApi = {
  /** POST /auth/register — 201, empty body (docs §4). */
  async register(payload: RegisterPayload): Promise<void> {
    await apiClient.post('/auth/register', payload);
  },

  /** POST /auth/verify-email — 200, empty body; generic 400 on any failure (docs §5). */
  async verifyEmail(payload: VerifyEmailPayload): Promise<void> {
    await apiClient.post('/auth/verify-email', payload);
  },

  /** POST /auth/resend-verification — always 202, empty body (docs §5). */
  async resendVerification(payload: ResendVerificationPayload): Promise<void> {
    await apiClient.post('/auth/resend-verification', payload);
  },

  /** POST /auth/forgot-password — always 202, empty body (docs §9). */
  async forgotPassword(payload: ForgotPasswordPayload): Promise<void> {
    await apiClient.post('/auth/forgot-password', payload);
  },

  /** POST /auth/reset-password — 200, empty body; generic 400 on any failure (docs §10). */
  async resetPassword(payload: ResetPasswordPayload): Promise<void> {
    await apiClient.post('/auth/reset-password', payload);
  },
};
