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

/**
 * Claims carried by a refresh token — the standard claims plus `jti`
 * (RFC 7519 §4.1.7), which identifies the persisted session record so each
 * refresh token can be individually rotated and revoked
 * (docs/04-api/authentication.md §8). Access tokens never carry `jti`.
 */
export interface RefreshTokenPayload extends JwtPayload {
  jti: string;
}

/**
 * Claims carried by an email verification token
 * (docs/06-backend/authentication.md §8). Deliberately minimal — no email or
 * role — and marked with a purpose claim so it is only ever usable for
 * verification.
 */
export interface EmailVerificationPayload {
  sub: string;
  purpose: string;
}

/**
 * Claims carried by a password reset token
 * (docs/06-backend/authentication.md §9). `pwd` is a short one-way HMAC
 * fingerprint of the user's *current* password hash: the moment any reset
 * succeeds, the hash changes and every outstanding reset token stops
 * matching — single use with no database storage.
 */
export interface PasswordResetPayload {
  sub: string;
  purpose: string;
  pwd: string;
}
