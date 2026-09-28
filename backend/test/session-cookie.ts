import { Response } from 'supertest';
import { REFRESH_COOKIE } from './../src/auth/session-cookie';

/**
 * Reading the session out of a response the way a browser would.
 *
 * The refresh token stopped travelling in response bodies: it leaves as an
 * HttpOnly cookie, so every test that used to keep a token from `login` now
 * keeps a cookie and sends it back. These three lines are what stands between
 * that and fifty copies of the same string handling.
 */

/** Every `Set-Cookie` line on a response, in order. */
export function setCookies(response: Response): string[] {
  const header = response.headers['set-cookie'] as
    string[] | string | undefined;
  if (!header) {
    return [];
  }
  return Array.isArray(header) ? header : [header];
}

/** The session cookie's line, attributes and all — for asserting on them. */
export function sessionSetCookie(response: Response): string | undefined {
  return setCookies(response).find((line) =>
    line.startsWith(`${REFRESH_COOKIE}=`),
  );
}

/**
 * The session cookie as a `Cookie` request header, or undefined when the
 * response carried none.
 *
 * A cleared cookie — the one logout sends, with an empty value — is
 * deliberately returned as undefined: a browser would have dropped it, and a
 * test that sent it on would be testing something no client can do.
 */
export function sessionCookie(response: Response): string | undefined {
  const line = sessionSetCookie(response);
  if (!line) {
    return undefined;
  }
  const value = line.slice(`${REFRESH_COOKIE}=`.length).split(';')[0];
  return value ? `${REFRESH_COOKIE}=${value}` : undefined;
}

/** The raw token inside the session cookie, for tests that decode it. */
export function sessionToken(response: Response): string {
  const cookie = sessionCookie(response);
  if (!cookie) {
    throw new Error('The response carried no session cookie.');
  }
  return cookie.slice(`${REFRESH_COOKIE}=`.length);
}

/** Wraps a bare token as the `Cookie` header a browser would have sent. */
export function cookieFor(token: string): string {
  return `${REFRESH_COOKIE}=${token}`;
}
