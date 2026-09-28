import { HttpResponse, http } from 'msw';
import { afterEach, describe, expect, it } from 'vitest';
import { api, server } from '@/test/server';
import { apiClient, normalizeApiError, refreshSession } from '@/lib/api-client';
import { authService } from '@/services/auth-service';
import { sessionHint } from '@/services/session-hint';
import { useAuthStore } from '@/stores/auth-store';
import type { ApiError } from '@/shared/types/api';

/**
 * The one piece of the frontend every feature depends on and none of them can
 * see: the token on each request, the single refresh behind a 401, and the
 * logout when that refresh fails. A bug here does not break one screen — it
 * signs people out mid-test or, worse, quietly stops signing them out.
 *
 * Since the session moved into an HttpOnly cookie, the refresh token is not
 * this code's business any more and there is nothing here that reads or
 * writes one. What is tested instead is that the client asks for a refresh
 * without carrying a token itself, asks only once however many requests fail
 * together, and gives the session up when the answer is no.
 */

const signedIn = (): void => {
  useAuthStore.getState().setSession('access-1');
  sessionHint.remember();
};

describe('apiClient', () => {
  afterEach(() => {
    useAuthStore.setState({ status: 'loading', accessToken: null });
    sessionStorage.clear();
  });

  it('sends cookies, or the session could never be renewed', () => {
    // The browser attaches the session cookie only when asked to; without
    // this every refresh would arrive at the server anonymous.
    expect(apiClient.defaults.withCredentials).toBe(true);
  });

  it('sends the access token with every request', async () => {
    signedIn();
    let seen: string | null = null;
    server.use(
      http.get(api('/users/me'), ({ request }) => {
        seen = request.headers.get('Authorization');
        return HttpResponse.json({ id: 'u-1' });
      }),
    );

    await apiClient.get('/users/me');

    expect(seen).toBe('Bearer access-1');
  });

  it('refreshes once on a 401 and replays the request with the new token', async () => {
    signedIn();
    const tokens: (string | null)[] = [];
    let refreshes = 0;
    let sentToken: unknown;
    server.use(
      http.post(api('/auth/refresh'), async ({ request }) => {
        refreshes += 1;
        sentToken = await request.text();
        return HttpResponse.json({ accessToken: 'access-2' });
      }),
      http.get(api('/users/me'), ({ request }) => {
        tokens.push(request.headers.get('Authorization'));
        return tokens.length === 1
          ? HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
          : HttpResponse.json({ id: 'u-1' });
      }),
    );

    const { data } = await apiClient.get<{ id: string }>('/users/me');

    expect(data).toEqual({ id: 'u-1' });
    expect(refreshes).toBe(1);
    expect(tokens).toEqual(['Bearer access-1', 'Bearer access-2']);
    // Nothing of the session is sent by hand: the cookie is the whole request.
    expect(sentToken).toBeFalsy();
  });

  it('refreshes only once when several requests get a 401 together', async () => {
    signedIn();
    let refreshes = 0;
    let unauthorized = 3;
    server.use(
      http.post(api('/auth/refresh'), () => {
        refreshes += 1;
        return HttpResponse.json({ accessToken: 'access-2' });
      }),
      http.get(api('/statistics'), () => {
        if (unauthorized > 0) {
          unauthorized -= 1;
          return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }
        return HttpResponse.json({ xp: 10 });
      }),
    );

    const answers = await Promise.all([
      apiClient.get('/statistics'),
      apiClient.get('/statistics'),
      apiClient.get('/statistics'),
    ]);

    expect(answers).toHaveLength(3);
    // Three failures, one refresh. Every refresh rotates the cookie, and the
    // backend reads a second presentation of a spent token as theft — by
    // revoking every session the account has. Coalescing is what keeps a
    // burst of requests from logging the reader out everywhere.
    expect(refreshes).toBe(1);
  });

  it('signs the reader out when the refresh itself is refused', async () => {
    signedIn();
    server.use(
      http.post(api('/auth/refresh'), () => HttpResponse.json({ message: 'Expired' }, { status: 401 })),
      http.get(api('/users/me'), () => HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })),
    );

    await expect(apiClient.get('/users/me')).rejects.toMatchObject({ status: 401 });

    expect(useAuthStore.getState().status).toBe('unauthenticated');
    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(sessionHint.exists()).toBe(false);
  });

  it('does not try to refresh a refresh that was refused', async () => {
    let calls = 0;
    server.use(
      http.post(api('/auth/refresh'), () => {
        calls += 1;
        return HttpResponse.json({ message: 'Expired' }, { status: 401 });
      }),
    );

    await expect(refreshSession()).rejects.toBeDefined();

    expect(calls).toBe(1);
  });
});

describe('session lifecycle', () => {
  afterEach(() => useAuthStore.setState({ status: 'loading', accessToken: null }));

  it('does not pester the server about a browser that never signed in', async () => {
    let calls = 0;
    server.use(
      http.post(api('/auth/refresh'), () => {
        calls += 1;
        return HttpResponse.json({ accessToken: 'access-1' });
      }),
    );

    await authService.bootstrap();

    // Every stranger opening the landing page would otherwise start with a
    // request that can only fail.
    expect(calls).toBe(0);
    expect(useAuthStore.getState().status).toBe('unauthenticated');
  });

  it('restores a session left behind by an earlier visit', async () => {
    sessionHint.remember();
    server.use(http.post(api('/auth/refresh'), () => HttpResponse.json({ accessToken: 'access-9' })));

    await authService.bootstrap();

    expect(useAuthStore.getState().status).toBe('authenticated');
    expect(useAuthStore.getState().accessToken).toBe('access-9');
  });

  it('gives up the session when the cookie is no longer good', async () => {
    sessionHint.remember();
    server.use(
      http.post(api('/auth/refresh'), () => HttpResponse.json({ message: 'Expired' }, { status: 401 })),
    );

    await authService.bootstrap();

    expect(useAuthStore.getState().status).toBe('unauthenticated');
    // The hint is dropped too, so the next cold start does not ask again.
    expect(sessionHint.exists()).toBe(false);
  });

  it('asks the server to end the session even though it cannot see the cookie', async () => {
    signedIn();
    let calls = 0;
    server.use(
      http.post(api('/auth/logout'), () => {
        calls += 1;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    await authService.logout();

    expect(calls).toBe(1);
    expect(useAuthStore.getState().status).toBe('unauthenticated');
    expect(sessionHint.exists()).toBe(false);
  });

  it('forgets the session locally even when the logout call fails', async () => {
    signedIn();
    server.use(http.post(api('/auth/logout'), () => HttpResponse.error()));

    await expect(authService.logout()).rejects.toBeDefined();

    expect(useAuthStore.getState().status).toBe('unauthenticated');
    expect(sessionHint.exists()).toBe(false);
  });
});

describe('normalizeApiError', () => {
  it('keeps the server’s sentence', async () => {
    server.use(
      http.get(api('/subjects'), () =>
        HttpResponse.json({ message: 'Такого користувача не знайдено.' }, { status: 404 }),
      ),
    );

    const error = (await apiClient.get('/subjects').catch((one: ApiError) => one)) as ApiError;

    expect(error).toMatchObject({ status: 404, message: 'Такого користувача не знайдено.' });
  });

  it('takes the first line of a validation list and keeps the rest for the form', async () => {
    server.use(
      http.post(api('/auth/register'), () =>
        HttpResponse.json({ message: ['email must be an email', 'password too short'] }, { status: 400 }),
      ),
    );

    const error = (await apiClient.post('/auth/register', {}).catch((one: ApiError) => one)) as ApiError;

    expect(error.message).toBe('email must be an email');
    expect(error.fields).toEqual({ _errors: ['email must be an email', 'password too short'] });
  });

  it('says it is the network, not the server, when nothing answered', () => {
    expect(normalizeApiError(new Error('boom'))).toEqual({
      status: 0,
      message: 'Сталася несподівана помилка.',
    });
  });
});
