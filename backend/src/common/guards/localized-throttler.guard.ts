import { Injectable } from '@nestjs/common';
import { ThrottlerException, ThrottlerGuard } from '@nestjs/throttler';

/**
 * The rate limiter's default rejection is `ThrottlerException: Too Many
 * Requests`, which the frontend renders verbatim: the API client shows the
 * server's `message` as-is. That would put an English exception class name in
 * front of a user, so the message is replaced with the Ukrainian sentence the
 * rest of the API already uses.
 *
 * The wording deliberately says nothing about which limit was reached or how
 * many attempts remain — on the login route, that would tell an attacker how
 * fast they may guess.
 */
const TOO_MANY_REQUESTS_MESSAGE =
  'Забагато запитів. Зачекайте трохи та спробуйте ще раз.';

@Injectable()
export class LocalizedThrottlerGuard extends ThrottlerGuard {
  // The base signature takes the execution context and the limit detail;
  // neither is needed, and the rejection deliberately does not vary by route.
  protected throwThrottlingException(): Promise<void> {
    throw new ThrottlerException(TOO_MANY_REQUESTS_MESSAGE);
  }
}
