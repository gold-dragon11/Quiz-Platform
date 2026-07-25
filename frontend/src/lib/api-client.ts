import axios, { AxiosError, type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios';
import { env } from '@/config/env';
import { tokenStorage } from '@/services/token-storage';
import { getAccessToken, useAuthStore } from '@/stores/auth-store';
import type { ApiError, TokenPair } from '@/shared/types/api';

/**
 * The application's single Axios client and the ONLY module permitted to
 * import Axios (Phase 6.1 decisions F2/F7, constraint 4). Every feature's
 * `api/` layer calls this instance and never re-implements authentication,
 * refresh, or error handling.
 *
 * Behaviour:
 * - a request interceptor attaches `Authorization: Bearer <access token>`;
 * - a response interceptor turns any error into a normalized `ApiError` and,
 *   on `401`, performs a single-flight token refresh, retries the original
 *   request exactly once, and logs out if the refresh fails;
 * - the refresh endpoint itself is never retried, and the rotated refresh
 *   token is persisted on every refresh (the backend rotates it each call).
 */
export const apiClient = axios.create({
  baseURL: env.apiUrl,
  headers: { 'Content-Type': 'application/json' },
});

/**
 * A bare Axios instance with no interceptors, used only to call the refresh
 * endpoint — so refreshing can never recurse through the response
 * interceptor.
 */
const refreshClient = axios.create({
  baseURL: env.apiUrl,
  headers: { 'Content-Type': 'application/json' },
});

// --- Session application ------------------------------------------------

/** Applies a fresh token pair: access → memory (store), refresh → storage. */
export function applyTokens(tokens: TokenPair): void {
  tokenStorage.setRefreshToken(tokens.refreshToken);
  useAuthStore.getState().setSession(tokens.accessToken);
}

/** Clears all session state (memory + storage) and marks unauthenticated. */
export function clearSession(): void {
  tokenStorage.clearRefreshToken();
  useAuthStore.getState().clearSession();
}

// --- Single-flight refresh ----------------------------------------------

let refreshInFlight: Promise<string> | null = null;

/**
 * Refreshes the session, coalescing concurrent callers onto one network call
 * (single-flight, decision F2). Resolves with the new access token; rejects
 * (and clears the session) if there is no refresh token or the refresh fails.
 */
export function refreshSession(): Promise<string> {
  if (refreshInFlight) {
    return refreshInFlight;
  }

  refreshInFlight = (async () => {
    const refreshToken = tokenStorage.getRefreshToken();
    if (!refreshToken) {
      clearSession();
      throw new Error('No refresh token available.');
    }
    try {
      const { data } = await refreshClient.post<TokenPair>('/auth/refresh', {
        refreshToken,
      });
      applyTokens(data);
      return data.accessToken;
    } catch (error) {
      // A failed/replayed refresh means the session is dead (the backend also
      // revokes all sessions on reuse) — log out.
      clearSession();
      throw error;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

// --- Interceptors -------------------------------------------------------

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
  const token = getAccessToken();
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

interface RetriableConfig extends AxiosRequestConfig {
  _retried?: boolean;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError): Promise<never> => {
    const original = error.config as RetriableConfig | undefined;

    const isUnauthorized = error.response?.status === 401;
    const isRefreshCall = original?.url?.includes('/auth/refresh');
    const alreadyRetried = original?._retried === true;

    if (isUnauthorized && original && !isRefreshCall && !alreadyRetried) {
      try {
        const newAccessToken = await refreshSession();
        original._retried = true;
        original.headers = {
          ...original.headers,
          Authorization: `Bearer ${newAccessToken}`,
        };
        return (await apiClient.request(original)) as never;
      } catch {
        // Refresh failed → session already cleared; fall through to reject.
      }
    }

    return Promise.reject(normalizeApiError(error));
  },
);

// --- Error normalization ------------------------------------------------

/**
 * Turns any Axios error into the `ApiError` every feature consumes (decision
 * F7). No feature ever parses a raw Axios error.
 */
export function normalizeApiError(error: unknown): ApiError {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status ?? 0;
    const data = error.response?.data as { message?: string | string[] } | undefined;

    let message = 'Something went wrong. Please try again.';
    if (typeof data?.message === 'string') {
      message = data.message;
    } else if (Array.isArray(data?.message) && data.message.length > 0) {
      message = data.message[0];
    } else if (status === 0) {
      message = 'Network error. Please check your connection.';
    }

    return {
      status,
      message,
      fields: fieldsFromMessage(data?.message),
    };
  }

  return { status: 0, message: 'An unexpected error occurred.' };
}

/**
 * NestJS's global validation pipe returns `message` as a string array of
 * field errors. We keep the flat list under a generic key so forms can
 * surface it; precise field mapping is a feature concern.
 */
function fieldsFromMessage(message: string | string[] | undefined): Record<string, string[]> | undefined {
  if (Array.isArray(message) && message.length > 0) {
    return { _errors: message };
  }
  return undefined;
}
