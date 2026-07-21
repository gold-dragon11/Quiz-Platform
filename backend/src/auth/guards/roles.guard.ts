import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { ROLES_KEY } from '../constants/auth.constants';
import { AuthenticatedRequest } from '../interfaces/authenticated-request.interface';

/**
 * Enforces the roles declared with @Roles() (docs/06-backend/security.md §6).
 *
 * Must run after JwtAuthGuard, which is what populates `request.user`. Handler
 * metadata overrides controller metadata, so a controller-wide requirement can
 * be narrowed per route. Returning false makes Nest respond 403 Forbidden.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<
      UserRole[] | undefined
    >(ROLES_KEY, [context.getHandler(), context.getClass()]);

    // No @Roles() metadata means the route has no role requirement.
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (!user) {
      return false;
    }

    return requiredRoles.includes(user.role);
  }
}
