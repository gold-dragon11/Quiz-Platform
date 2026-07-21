/**
 * The access + refresh token pair issued on login and on refresh
 * (docs/04-api/authentication.md §6, §8).
 */
export type TokenPair = {
  accessToken: string;
  refreshToken: string;
};
