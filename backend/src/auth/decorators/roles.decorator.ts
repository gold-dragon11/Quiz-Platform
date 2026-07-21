import { CustomDecorator, SetMetadata } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { ROLES_KEY } from '../constants/auth.constants';

/**
 * Declares which roles may access a route or controller. Enforced by RolesGuard.
 *
 * @example
 * ```ts
 * @Roles(UserRole.ADMIN)
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @Get('subjects')
 * findAll() {}
 * ```
 */
export const Roles = (...roles: UserRole[]): CustomDecorator<string> =>
  SetMetadata(ROLES_KEY, roles);
