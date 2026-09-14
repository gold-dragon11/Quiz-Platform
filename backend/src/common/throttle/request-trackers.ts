import { JwtService } from '@nestjs/jwt';
import type { ThrottlerGetTrackerFunction } from '@nestjs/throttler';

/**
 * Who a request counts against, for rate limiting (docs/06-backend/security.md
 * §12).
 *
 * The library's default is the client address, and on its own that is wrong
 * for this product: a school class on one Wi-Fi, or everyone on one mobile
 * carrier's NAT, shares a public address. Thirty-five students sitting a mock
 * exam from one room would share one allowance, and the thirty-sixth request
 * of the minute would reject somebody's saved answer mid-paper.
 */

/** The client address. `TRUST_PROXY` makes this the real client behind Render. */
export const byAddress: ThrottlerGetTrackerFunction = (req) =>
  `ip:${String(req.ip)}`;

/**
 * The person, where the request proves who that is.
 *
 * The bearer token is verified, not merely decoded: an unverified `sub` would
 * let a script send a different made-up user on every request and never be
 * counted twice. A token that is missing, forged or expired falls back to the
 * address, so it cannot buy an allowance of its own.
 */
export function byPerson(jwt: JwtService): ThrottlerGetTrackerFunction {
  return (req, context) => {
    const headers = req.headers as Record<string, unknown> | undefined;
    const header = headers?.authorization;
    if (typeof header === 'string' && header.startsWith('Bearer ')) {
      try {
        const payload = jwt.verify<{ sub?: unknown }>(header.slice(7));
        if (typeof payload.sub === 'string' && payload.sub) {
          return `user:${payload.sub}`;
        }
      } catch {
        // Invalid or expired — counted by address below.
      }
    }
    return byAddress(req, context);
  };
}

/**
 * The account a credential request is about: the email in the body, as the
 * services normalise it. Login attempts on one account are limited wherever
 * they come from, and a class logging in at once is not limited as one.
 */
export const byAccount: ThrottlerGetTrackerFunction = (req, context) => {
  const body = req.body as Record<string, unknown> | undefined;
  const email = body?.email;
  return typeof email === 'string' && email.trim()
    ? `email:${email.trim().toLowerCase()}`
    : byAddress(req, context);
};
