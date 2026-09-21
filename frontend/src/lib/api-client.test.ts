import { HttpResponse, http } from 'msw';
import { afterEach, describe, expect, it } from 'vitest';
import { api, server } from '@/test/server';
import { apiClient, normalizeApiError, refreshSession } from '@/lib/api-client';
import { tokenStorage } from '@/services/token-storage';
import { useAuthStore } from '@/stores/auth-store';
import type { ApiError } from '@/shared/types/api';

/**
 * The one piece of the frontend every feature depends on and none of them can
 * see: the token on each request, the single refresh behind a 401, and the
 * logout when that refresh fails. A bug here does not break one screen — it
 * signs people out mid-test or, worse, quietly stops signing them out.
 */

const signedIn = (): void => {
  useAuthStore.getState().setSession('access-1');
  tokenStorage.setRefreshToken('refresh-1');
};

describe('apiClient', () => {
  afterEach(() => {
    useAuthStore.setState({ status: 'loading', accessToken: null });
    sessionStorage.clear();
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
    server.use(
      http.post(api('/auth/refresh'), () => {
        refreshes += 1;
        return HttpResponse.json({ accessToken: 'access-2', refreshToken: 'refresh-2' });
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
    // The rotated refresh token is kept: the backend invalidates the old one.
    expect(tokenStorage.getRefreshToken()).toBe('refresh-2');
  });

  it('refreshes only once when several requests get a 401 together', async () => {
    signedIn();
    let refreshes = 0;
    let unauthorized = 3;
    server.use(
      http.post(api('/auth/refresh'), () => {
        refreshes += 1;
        return HttpResponse.json({ accessToken: 'access-2', refreshToken: 'refresh-2' });
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
    // Three failures, one refresh — the single-flight promise is what keeps a
    // burst of requests from rotating the refresh token three times, which the
    // backend treats as reuse and answers by killing the session.
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
    expect(tokenStorage.getRefreshToken()).toBeNull();
  });

  it('does not try to refresh a refresh that was refused', async () => {
    tokenStorage.setRefreshToken('refresh-1');
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

  it('refuses to refresh at all when there is no refresh token', async () => {
    let calls = 0;
    server.use(
      http.post(api('/auth/refresh'), () => {
        calls += 1;
        return HttpResponse.json({ accessToken: 'a', refreshToken: 'b' });
      }),
    );

    await expect(refreshSession()).rejects.toThrow();

    expect(calls).toBe(0);
    expect(useAuthStore.getState().status).toBe('unauthenticated');
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
