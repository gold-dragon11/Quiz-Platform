/**
 * Refresh-token persistence (Phase 6.1 decision F3).
 *
 * Security policy: the access token lives in memory only (the auth store);
 * the refresh token lives in `sessionStorage` — it survives a reload but is
 * cleared when the tab closes, and is never written to `localStorage`. No
 * "remember me" in the MVP.
 */
const REFRESH_TOKEN_KEY = 'quix.refreshToken';

export const tokenStorage = {
  getRefreshToken(): string | null {
    try {
      return sessionStorage.getItem(REFRESH_TOKEN_KEY);
    } catch {
      return null;
    }
  },

  setRefreshToken(token: string): void {
    try {
      sessionStorage.setItem(REFRESH_TOKEN_KEY, token);
    } catch {
      // Storage unavailable (private mode / disabled) — the session simply
      // won't survive a reload; nothing else to do.
    }
  },

  clearRefreshToken(): void {
    try {
      sessionStorage.removeItem(REFRESH_TOKEN_KEY);
    } catch {
      // ignore
    }
  },
};
