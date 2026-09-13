import { UserRole } from '@prisma/client';

/**
 * The roles an administrator may assign through the API.
 *
 * `ADMIN` is deliberately absent, in both directions: this endpoint can
 * neither grant it nor take it away. Administrator access is granted where the
 * platform is deployed, not through a screen — an HTTP route that can mint
 * administrators is one compromised administrator session away from being
 * permanent, and one misclick away from a platform with no administrators at
 * all.
 *
 * Spelled out as values rather than derived from the enum on purpose: adding a
 * role to `UserRole` must not silently widen what this endpoint can hand out.
 */
export const ASSIGNABLE_ROLES = [UserRole.USER, UserRole.TEACHER] as const;

export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];
