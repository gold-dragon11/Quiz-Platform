import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Said the same way for both locks (decision 44), and without a number: how
 * long, or how many tries are left, would tell whoever is guessing their pace.
 * The wait itself goes in `Retry-After`, which the controller sets.
 */
export const LOGIN_LOCKED_MESSAGE =
  'Забагато невдалих спроб входу. Зачекайте чверть години або відновіть пароль.';

export class LoginLockedException extends HttpException {
  constructor(readonly retryAfterSeconds: number) {
    super(LOGIN_LOCKED_MESSAGE, HttpStatus.TOO_MANY_REQUESTS);
  }
}
