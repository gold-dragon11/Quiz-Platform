import { UserRole } from '@prisma/client';

/**
 * Claims carried inside an access token.
 *
 * `sub` holds the user id (RFC 7519 registered claim). `role` is embedded so
 * that authorization decisions stay stateless and RolesGuard does not need a
 * database round-trip on every request (docs/04-api/authentication.md §2).
 */
export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
}

/**
 * A JwtPayload as returned by passport-jwt, after the signature and expiry have
 * been verified. `iat` and `exp` are added by the signing library.
 */
export interface VerifiedJwtPayload extends JwtPayload {
  iat: number;
  exp: number;
}
