import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { AuthenticatedRequest } from '../interfaces/authenticated-request.interface';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

/**
 * Injects the authenticated principal, or a single property of it, into a
 * controller method. Only meaningful on routes protected by JwtAuthGuard —
 * without it `request.user` is undefined.
 *
 * @example
 * ```ts
 * findMe(@CurrentUser() user: AuthenticatedUser) {}
 * findMe(@CurrentUser('id') userId: string) {}
 * ```
 */
export const CurrentUser = createParamDecorator(
  (
    property: keyof AuthenticatedUser | undefined,
    context: ExecutionContext,
  ):
    | AuthenticatedUser
    | AuthenticatedUser[keyof AuthenticatedUser]
    | undefined => {
    const { user } = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (!user) {
      return undefined;
    }

    return property ? user[property] : user;
  },
);
