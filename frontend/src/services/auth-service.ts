import { apiClient, applySession, clearSession, refreshSession } from '@/lib/api-client';
import { sessionHint } from '@/services/session-hint';
import { useAuthStore } from '@/stores/auth-store';
import type { AccessTokenResponse } from '@/shared/types/api';
import type { CurrentUser, LoginCredentials } from '@/shared/types/auth';

/**
 * Application-wide authentication service (Phase 6.1 decision F5). Owns the
 * calls that establish, verify, and end a session; feature UI consumes these
 * (typically wrapped in TanStack Query mutations) and never touches tokens
 * directly. All token/session handling is delegated to the Axios layer.
 */
export const authService = {
  /** Authenticates and takes up the session the response establishes. */
  async login(credentials: LoginCredentials): Promise<void> {
    const { data } = await apiClient.post<AccessTokenResponse>('/auth/login', credentials);
    applySession(data);
  },

  /**
   * Submits an emailed verification token and applies the returned token
   * pair (docs/04-api/authentication.md §5). Confirming the token is already
   * a single-use, short-lived proof of control over the mailbox — the same
   * standard the login form itself relies on — so the response signs the
   * reader straight in rather than sending them to it.
   */
  async verifyEmail(token: string): Promise<void> {
    const { data } = await apiClient.post<AccessTokenResponse>('/auth/verify-email', { token });
    applySession(data);
  },

  /** The authenticated session summary (server state — GET /auth/me). */
  async getCurrentUser(): Promise<CurrentUser> {
    const { data } = await apiClient.get<CurrentUser>('/auth/me');
    return data;
  },

  /**
   * Ends the session: the server revokes it and removes the cookie
   * (idempotent 204), then this tab forgets it regardless of the network
   * outcome.
   *
   * The call is now made unconditionally. The page cannot see the cookie to
   * decide whether there is anything to revoke, and asking is harmless — the
   * endpoint answers 204 either way, on purpose.
   */
  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      clearSession();
    }
  },

  /**
   * Startup silent re-authentication (decision F5): exchange the session
   * cookie for a fresh access token, or settle as unauthenticated. Never
   * throws — bootstrap must always resolve.
   *
   * Since the cookie is invisible to this code, the local hint decides
   * whether it is worth asking at all; without it every first-time visitor to
   * the landing page would open with a request that can only fail.
   */
  async bootstrap(): Promise<void> {
    if (!sessionHint.exists()) {
      useAuthStore.getState().setUnauthenticated();
      return;
    }
    try {
      await refreshSession();
    } catch {
      // refreshSession already cleared the session on failure.
    }
  },
};
