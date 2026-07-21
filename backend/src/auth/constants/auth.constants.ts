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
