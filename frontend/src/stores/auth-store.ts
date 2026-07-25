import { create } from 'zustand';

/**
 * Authentication client state (Phase 6.1 decisions F3/F5/F9).
 *
 * Holds ONLY the access token and the authentication status — the current
 * user object is server state and comes exclusively from TanStack Query
 * (`/auth/me`), never duplicated here. The access token lives in memory only
 * (never persisted); the refresh token lives in sessionStorage (token
 * storage service).
 *
 * `status` starts as `loading` so route guards render the bootstrap loading
 * state instead of flashing `/login` on reload.
 */
export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthState {
  status: AuthStatus;
  accessToken: string | null;
  /** Marks the session authenticated with a fresh access token. */
  setSession: (accessToken: string) => void;
  /** Clears the in-memory session and marks the user unauthenticated. */
  clearSession: () => void;
  /** Sets the bootstrap outcome when no session is established. */
  setUnauthenticated: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'loading',
  accessToken: null,
  setSession: (accessToken) => set({ status: 'authenticated', accessToken }),
  clearSession: () => set({ status: 'unauthenticated', accessToken: null }),
  setUnauthenticated: () => set({ status: 'unauthenticated', accessToken: null }),
}));

/** Non-reactive read of the current access token (for the Axios interceptor). */
export function getAccessToken(): string | null {
  return useAuthStore.getState().accessToken;
}
