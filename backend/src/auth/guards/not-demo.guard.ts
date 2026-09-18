import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

export const DEMO_READ_ONLY_MESSAGE =
  'Це демо-акаунт: пароль, профіль і видалення тут вимкнені. Щоночі він повертається до початкового стану.';

/**
 * Refuses a demo account the changes that would spoil it for the next person.
 *
 * The credentials are public (docs/08-development/deployment.md §17.9), so
 * anyone who signs in could change the password and lock everyone else out
 * until the nightly reset, or rename the account into something that then
 * greets every reviewer. Everything else — sitting tests, setting homework —
 * stays open: that is what the demo is for, and the reset puts it back.
 *
 * Runs after JwtAuthGuard, which sets `request.user`.
 */
@Injectable()
export class NotDemoGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const user = context
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUser }>().user;
    if (user?.isDemo) {
      throw new ForbiddenException(DEMO_READ_ONLY_MESSAGE);
    }
    return true;
  }
}
