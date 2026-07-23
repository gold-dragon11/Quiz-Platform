import { applyDecorators, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from './roles.decorator';

/**
 * Marks a route — or an entire controller — as administrator-only
 * (docs/06-backend/security.md §6-7, docs/04-api/admin.md §3).
 *
 * Thin wrapper around `@Roles(UserRole.ADMIN)` that also attaches the guards
 * enforcing it, in the required order: JwtAuthGuard authenticates the request
 * (missing/invalid token → 401), then RolesGuard authorizes it (authenticated
 * but not an administrator → 403). Bundling the guards with the metadata means
 * a route can never carry the admin requirement without its enforcement.
 *
 * @example
 * ```ts
 * @AdminOnly()
 * @Get('subjects')
 * findAll() {}
 * ```
 */
export function AdminOnly(): MethodDecorator & ClassDecorator {
  return applyDecorators(
    UseGuards(JwtAuthGuard, RolesGuard),
    Roles(UserRole.ADMIN),
  );
}
