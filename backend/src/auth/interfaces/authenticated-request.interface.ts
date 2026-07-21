import { Request } from 'express';
import { AuthenticatedUser } from './authenticated-user.interface';

/**
 * An Express request that has passed JwtAuthGuard and therefore carries a
 * populated `user`. Use this instead of casting `request.user` at call sites.
 */
export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}
