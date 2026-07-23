import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { ROLES_KEY } from '../constants/auth.constants';
import { AuthenticatedRequest } from '../interfaces/authenticated-request.interface';

/**
 * Enforces the roles declared with @Roles() (docs/06-backend/security.md §6).
 *
 * Must run after JwtAuthGuard, which is what populates `request.user` — the
 * @AdminOnly() decorator attaches both guards in that order. The role checked
 * here is the one JwtStrategy loaded from the database on this request, never
 * the token claim, so a role change takes effect immediately.
 *
 * Handler metadata overrides controller metadata, so a controller-wide
 * requirement can be narrowed per route.
 *
 * Status semantics (docs/06-backend/security.md §7): a request that never
 * authenticated is 401; an authenticated principal lacking the required role
 * is 403.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<
      UserRole[] | undefined
    >(ROLES_KEY, [context.getHandler(), context.getClass()]);

    // No @Roles() metadata means the route has no role requirement.
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const { user } = request;

    // No authenticated principal — the guard ran without JwtAuthGuard in
    // front of it. Fail closed with the unauthenticated status.
    if (!user) {
      throw new UnauthorizedException();
    }

    if (!requiredRoles.includes(user.role)) {
      // Permission violations are security-logged
      // (docs/06-backend/security.md §14): identifiers and route only —
      // never tokens, headers, or request bodies.
      this.logger.warn(
        `Authorization denied: user ${user.id} (role ${user.role}) on ${request.method} ${request.url}`,
      );
      throw new ForbiddenException();
    }

    return true;
  }
}
