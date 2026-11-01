import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * The «turn this email off» link (decision 48). It has to work without
 * signing in, from a phone, years later, so it carries no expiry: what it
 * proves is that the server wrote it for this account, and the only thing it
 * can do is switch one email off.
 *
 * The key is derived from the email-verification secret with a label of its
 * own, so no new secret has to be configured and a token of this kind can
 * never pass for a verification token or the other way round.
 */
const LABEL = 'unsubscribe:mistakes-waiting';

function keyFrom(secret: string): Buffer {
  return createHmac('sha256', secret).update(LABEL).digest();
}

function mac(secret: string, userId: string): Buffer {
  return createHmac('sha256', keyFrom(secret)).update(userId).digest();
}

export function signUnsubscribeToken(secret: string, userId: string): string {
  return `${userId}.${mac(secret, userId).toString('base64url')}`;
}

/** The account the token was written for, or null if it is not ours. */
export function readUnsubscribeToken(
  secret: string,
  token: string,
): string | null {
  const [userId, signature, ...rest] = token.split('.');
  if (!userId || !signature || rest.length > 0) {
    return null;
  }
  const expected = mac(secret, userId);
  const given = Buffer.from(signature, 'base64url');
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return null;
  }
  return userId;
}
