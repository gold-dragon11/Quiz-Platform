import { applyDecorators, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from './roles.decorator';

/**
 * Marks a route — or an entire controller — as teacher-only
 * (docs/00-overview/teacher-side-decisions.md decision 17).
 *
 * Same shape as `@AdminOnly()`: JwtAuthGuard authenticates (missing or invalid
 * token → 401), then RolesGuard authorizes (authenticated but not a teacher →
 * 403). Bundling the guards with the metadata means a route can never carry the
 * requirement without its enforcement.
 *
 * Deliberately does not admit administrators. An administrator manages the
 * question bank; they own no groups, so every teacher route would return an
 * empty result for them and the wider role would buy nothing but confusion.
 */
export function TeacherOnly(): MethodDecorator & ClassDecorator {
  return applyDecorators(
    UseGuards(JwtAuthGuard, RolesGuard),
    Roles(UserRole.TEACHER),
  );
}
