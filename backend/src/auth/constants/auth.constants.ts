/**
 * Name the JWT access-token strategy is registered under with Passport.
 * Shared by JwtStrategy, JwtAuthGuard, and PassportModule registration so the
 * string literal is never repeated.
 */
export const JWT_STRATEGY = 'jwt';

/**
 * Metadata key written by the @Roles() decorator and read by RolesGuard.
 */
export const ROLES_KEY = 'roles';

/**
 * `purpose` claim carried by email verification tokens
 * (docs/06-backend/authentication.md §8). A token without this exact claim is
 * never accepted for verification, and tokens carrying it are signed with a
 * dedicated secret so they can never act as access or refresh tokens.
 */
export const EMAIL_VERIFICATION_PURPOSE = 'email_verification';
