/**
 * What `issueTokens` produces: the pair, plus the moment the refresh token
 * expires (docs/04-api/authentication.md §6, §8).
 *
 * The expiry travels with the pair because three things must agree on it —
 * the JWT's own `exp` claim, the session row in the database, and the cookie
 * the browser keeps. Deriving it once and passing it along is what stops them
 * drifting apart.
 *
 * This type is internal to the server. The refresh token never appears in a
 * response body; it leaves only as an HttpOnly cookie (src/auth/session-cookie.ts),
 * and what the client receives is `AccessTokenResponse`.
 */
export type TokenPair = {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
};

/**
 * What login, verify-email and refresh answer with. The access token is meant
 * to be read by the page — it goes in memory and on every `Authorization`
 * header — so it travels in the body, as it always has.
 */
export type AccessTokenResponse = {
  accessToken: string;
};
