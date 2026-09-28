import axios, { AxiosError, type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios';
import { env } from '@/config/env';
import { sessionHint } from '@/services/session-hint';
import { getAccessToken, useAuthStore } from '@/stores/auth-store';
import type { AccessTokenResponse, ApiError } from '@/shared/types/api';

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
 * - the refresh endpoint itself is never retried.
 *
 * The refresh token is not handled here at all any more. It travels as an
 * HttpOnly cookie the browser attaches by itself, which is why both clients
 * are created with `withCredentials` — without it the browser sends no
 * cookies on a cross-origin call, however the cookie itself is written.
 */
export const apiClient = axios.create({
  baseURL: env.apiUrl,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

/**
 * A bare Axios instance with no interceptors, used only to call the refresh
 * endpoint — so refreshing can never recurse through the response
 * interceptor.
 */
const refreshClient = axios.create({
  baseURL: env.apiUrl,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// --- Session application ------------------------------------------------

/**
 * Takes up a session: the access token into memory, and a note that this
 * browser has one so the next cold start knows to ask.
 */
export function applySession(tokens: AccessTokenResponse): void {
  sessionHint.remember();
  useAuthStore.getState().setSession(tokens.accessToken);
}

/**
 * Drops the session this tab can see. The cookie itself is the server's to
 * remove — `/auth/logout` clears it — so this is about the page forgetting,
 * not about the session being revoked.
 */
export function clearSession(): void {
  sessionHint.forget();
  useAuthStore.getState().clearSession();
}

// --- Single-flight refresh ----------------------------------------------

let refreshInFlight: Promise<string> | null = null;

/** The name every tab of this app queues on while one of them refreshes. */
const REFRESH_LOCK = 'quix.refresh';

/**
 * Refreshes the session, coalescing concurrent callers onto one network call
 * (single-flight, decision F2). Resolves with the new access token; rejects
 * and clears the session if the refresh fails.
 *
 * The coalescing has to reach across tabs, not just across callers in this
 * one. The cookie is shared by every tab, and the backend rotates it on each
 * refresh and treats a second presentation of an already-spent token as
 * theft — by revoking every session the account holds. Two tabs waking up
 * together with an expired access token would do exactly that and log the
 * reader out everywhere. So the whole exchange runs inside a Web Lock: the
 * second tab waits, and by the time it runs the browser hands it the rotated
 * cookie, which is valid.
 *
 * The waiting tab then refreshes again rather than reading what the first one
 * got — an access token lives in one tab's memory and cannot be shared. That
 * costs one extra rotation and is the cheapest correct answer.
 */
export function refreshSession(): Promise<string> {
  if (refreshInFlight) {
    return refreshInFlight;
  }

  refreshInFlight = (async () => {
    try {
      return await withRefreshLock(exchangeCookieForAccessToken);
    } catch (error) {
      // A refused refresh means the session is over: expired, logged out
      // elsewhere, or revoked because the backend saw a replay.
      clearSession();
      throw error;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

async function exchangeCookieForAccessToken(): Promise<string> {
  const { data } = await refreshClient.post<AccessTokenResponse>('/auth/refresh');
  applySession(data);
  return data.accessToken;
}

/**
 * Runs the exchange under a cross-tab lock where the browser has them, and
 * directly where it does not — an older browser keeps the behaviour it had
 * before, which is the one-tab guarantee rather than none.
 */
function withRefreshLock<T>(run: () => Promise<T>): Promise<T> {
  if (typeof navigator === 'undefined' || !navigator.locks) {
    return run();
  }
  return navigator.locks.request(REFRESH_LOCK, run) as Promise<T>;
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

    let message = 'Щось пішло не так. Спробуйте ще раз.';
    if (typeof data?.message === 'string') {
      message = data.message;
    } else if (Array.isArray(data?.message) && data.message.length > 0) {
      message = data.message[0];
    } else if (status === 0) {
      message = 'Помилка мережі. Перевірте зʼєднання.';
    }

    return {
      status,
      message,
      fields: fieldsFromMessage(data?.message),
    };
  }

  return { status: 0, message: 'Сталася несподівана помилка.' };
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
