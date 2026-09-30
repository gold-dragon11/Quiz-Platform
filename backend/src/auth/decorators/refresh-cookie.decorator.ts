import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import type { Request } from 'express';
import { REFRESH_COOKIE } from '../session-cookie';

/**
 * The refresh token, taken from its HttpOnly cookie.
 *
 * It used to arrive in the request body and was validated like any other
 * field. A cookie is not a field: the browser attaches it or it does not, and
 * a route that needs it has nothing to validate — either there is a token to
 * check against the database or the caller is not signed in. So this reads
 * the cookie and leaves judging it to the service, which answers every bad
 * token with the same bare 401 regardless of how it was bad.
 */
export const RefreshCookie = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string | undefined => {
    const request = context.switchToHttp().getRequest<Request>();
    return request.cookies?.[REFRESH_COOKIE] as string | undefined;
  },
);
