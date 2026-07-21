import { UserRole } from '@prisma/client';

/**
 * The authenticated principal attached to `request.user` by JwtStrategy.
 *
 * Deliberately minimal — it carries only what guards and controllers need for
 * authorization. Full user records are loaded through the Users module.
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
}
