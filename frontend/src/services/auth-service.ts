import { apiClient, applyTokens, clearSession, refreshSession } from '@/lib/api-client';
import { tokenStorage } from '@/services/token-storage';
import { useAuthStore } from '@/stores/auth-store';
import type { TokenPair } from '@/shared/types/api';
import type { CurrentUser, LoginCredentials } from '@/shared/types/auth';

/**
 * Application-wide authentication service (Phase 6.1 decision F5). Owns the
 * calls that establish, verify, and end a session; feature UI consumes these
 * (typically wrapped in TanStack Query mutations) and never touches tokens
 * directly. All token/session handling is delegated to the Axios layer.
 */
export const authService = {
  /** Authenticates and applies the returned token pair. */
  async login(credentials: LoginCredentials): Promise<void> {
    const { data } = await apiClient.post<TokenPair>('/auth/login', credentials);
    applyTokens(data);
  },

  /**
   * Submits an emailed verification token and applies the returned token
   * pair (docs/04-api/authentication.md §5). Confirming the token is already
   * a single-use, short-lived proof of control over the mailbox — the same
   * standard the login form itself relies on — so the response signs the
   * reader straight in rather than sending them to it.
   */
  async verifyEmail(token: string): Promise<void> {
    const { data } = await apiClient.post<TokenPair>('/auth/verify-email', { token });
    applyTokens(data);
  },

  /** The authenticated session summary (server state — GET /auth/me). */
  async getCurrentUser(): Promise<CurrentUser> {
    const { data } = await apiClient.get<CurrentUser>('/auth/me');
    return data;
  },

  /**
   * Ends the session: revokes the refresh token server-side (idempotent 204)
   * then clears local session state regardless of the network outcome.
   */
  async logout(): Promise<void> {
    const refreshToken = tokenStorage.getRefreshToken();
    try {
      if (refreshToken) {
        await apiClient.post('/auth/logout', { refreshToken });
      }
    } finally {
      clearSession();
    }
  },

  /**
   * Startup silent re-authentication (decision F5): if a refresh token
   * survives in sessionStorage, exchange it for a fresh session; otherwise
   * settle as unauthenticated. Never throws — bootstrap must always resolve.
   */
  async bootstrap(): Promise<void> {
    if (!tokenStorage.getRefreshToken()) {
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
