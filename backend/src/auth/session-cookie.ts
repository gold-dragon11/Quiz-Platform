import type { Response } from 'express';
import { SessionCookieConfig } from '../config/configuration';

/**
 * The refresh token's cookie — the one place that decides how a session
 * survives the browser being closed (docs/04-api/authentication.md §8).
 *
 * The token is deliberately never handed to JavaScript. An access token lives
 * fifteen minutes in a tab's memory and dies with it; a refresh token is worth
 * a week, and anything a script can read, a cross-site scripting flaw can
 * steal. `HttpOnly` puts it out of reach of the page entirely, which is what
 * makes remembering a session for a week defensible at all.
 *
 * `SameSite=Lax` is the whole CSRF defence, and it is enough here because the
 * site and the API share a registrable domain — `learn-ls.com` and
 * `api.learn-ls.com` are the same site, so our own requests carry the cookie
 * while a POST from someone else's page does not. The access token that the
 * refresh answers with is unreadable cross-origin anyway, so a forged call
 * would achieve nothing even if it arrived. No separate CSRF token earns its
 * keep against that.
 *
 * No `Domain` attribute, deliberately. The cookie is set by the API and sent
 * back to the API, and a browser keys a cookie by where the request is going,
 * not by which page made it — so host-only is enough for the site to renew a
 * session, and it keeps the cookie off every other subdomain. `cookieDomain`
 * exists for a topology that one day needs it and is expected to stay unset.
 *
 * `Path` is narrowed to the auth routes: the cookie has no business riding
 * along with every request for a question.
 */
export const REFRESH_COOKIE = 'quix_rt';

/** Everything below /api/v1/auth, and nothing else, receives the cookie. */
const COOKIE_PATH = '/api/v1/auth';

interface CookieOptions {
  httpOnly: true;
  secure: boolean;
  sameSite: 'lax';
  path: string;
  domain?: string;
}

function baseOptions(config: SessionCookieConfig): CookieOptions {
  return {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: 'lax',
    path: COOKIE_PATH,
    ...(config.cookieDomain ? { domain: config.cookieDomain } : {}),
  };
}

/**
 * Writes the refresh token, expiring exactly when the token itself does.
 *
 * The expiry comes from the token's own `exp` claim rather than from a
 * duration configured twice: the cookie, the JWT and the session row then
 * cannot drift apart, which is the same reason the session row mirrors `exp`.
 */
export function setRefreshCookie(
  res: Response,
  token: string,
  expiresAt: Date,
  config: SessionCookieConfig,
): void {
  res.cookie(REFRESH_COOKIE, token, {
    ...baseOptions(config),
    expires: expiresAt,
  });
}

/**
 * Removes the cookie. Every attribute except the value must match the one
 * that set it — a browser treats a cookie with a different path or domain as
 * a different cookie and would leave the original in place.
 */
export function clearRefreshCookie(
  res: Response,
  config: SessionCookieConfig,
): void {
  res.clearCookie(REFRESH_COOKIE, baseOptions(config));
}
