import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../../config/configuration';
import { DEMO_STUDENT } from '../../demo/demo.constants';
import { OwnerAlertsService } from '../../owner-alerts/owner-alerts.service';
import {
  ACCOUNT_LIMIT,
  LoginAttemptsService,
  MAX_KEYS,
  PAIR_LIMIT,
  PAIR_WINDOW_MS,
} from './login-attempts.service';

/**
 * Who a failed sign-in locks out (decision 44): the address that keeps
 * guessing, never the owner elsewhere, never the public demo for everyone.
 */
describe('LoginAttemptsService', () => {
  const EMAIL = 'olena@example.com';
  const HOME = '203.0.113.7';
  const ATTACKER = '198.51.100.9';
  const T0 = 1_800_000_000_000;

  let announce: jest.Mock;

  const build = (enabled = true): LoginAttemptsService => {
    announce = jest.fn().mockResolvedValue(undefined);
    const config = {
      get: () => ({ enabled, ttl: 60, limit: 120 }),
    } as unknown as ConfigService<AppConfig, true>;
    const alerts = {
      announceLoginPressure: announce,
    } as unknown as OwnerAlertsService;
    return new LoginAttemptsService(config, alerts);
  };

  const fail = (
    service: LoginAttemptsService,
    times: number,
    address = ATTACKER,
    email = EMAIL,
    at = T0,
  ): void => {
    for (let i = 0; i < times; i += 1) {
      service.recordFailure(email, address, at + i);
    }
  };

  it('lets four failures pass and locks the address on the fifth', () => {
    const service = build();

    fail(service, PAIR_LIMIT - 1);
    expect(service.retryAfter(EMAIL, ATTACKER, T0 + 10)).toBe(0);

    fail(service, 1);
    expect(service.retryAfter(EMAIL, ATTACKER, T0 + 10)).toBeGreaterThan(0);
  });

  it('leaves the owner signing in from another address untouched', () => {
    const service = build();
    fail(service, PAIR_LIMIT * 3);

    expect(service.retryAfter(EMAIL, HOME, T0 + 100)).toBe(0);
  });

  it('treats the email case-insensitively, so case cannot buy fresh tries', () => {
    const service = build();
    fail(service, PAIR_LIMIT, ATTACKER, 'Olena@Example.COM');

    expect(service.retryAfter(EMAIL, ATTACKER, T0 + 10)).toBeGreaterThan(0);
  });

  it('opens again once the quarter hour has passed', () => {
    const service = build();
    fail(service, PAIR_LIMIT);

    expect(
      service.retryAfter(EMAIL, ATTACKER, T0 + PAIR_WINDOW_MS - 1000),
    ).toBeGreaterThan(0);
    expect(service.retryAfter(EMAIL, ATTACKER, T0 + PAIR_WINDOW_MS + 10)).toBe(
      0,
    );
  });

  it('forgets failures that fell out of the window', () => {
    const service = build();
    fail(service, PAIR_LIMIT - 1, ATTACKER, EMAIL, T0);
    fail(service, 1, ATTACKER, EMAIL, T0 + PAIR_WINDOW_MS + 1);

    expect(service.retryAfter(EMAIL, ATTACKER, T0 + PAIR_WINDOW_MS + 2)).toBe(
      0,
    );
  });

  it('clears every count on the account when the owner proves who they are', () => {
    const service = build();
    fail(service, PAIR_LIMIT);

    service.forget(EMAIL);

    expect(service.retryAfter(EMAIL, ATTACKER, T0 + 10)).toBe(0);
  });

  it('stops answering an account guessed from many addresses, and tells the owner once', () => {
    const service = build();
    for (let i = 0; i < ACCOUNT_LIMIT + 5; i += 1) {
      service.recordFailure(
        EMAIL,
        `10.0.${Math.floor(i / 250)}.${i % 250}`,
        T0 + i,
      );
    }

    expect(service.retryAfter(EMAIL, HOME, T0 + 1000)).toBeGreaterThan(0);
    expect(announce).toHaveBeenCalledTimes(1);
    expect(announce).toHaveBeenCalledWith(EMAIL);
  });

  it('never puts the public demo under the account ceiling', () => {
    const service = build();
    for (let i = 0; i < ACCOUNT_LIMIT * 2; i += 1) {
      service.recordFailure(DEMO_STUDENT.email, `10.1.0.${i % 250}`, T0 + i);
    }

    expect(service.retryAfter(DEMO_STUDENT.email, HOME, T0 + 1000)).toBe(0);
    expect(announce).not.toHaveBeenCalled();
  });

  it('still locks one address that keeps guessing the demo, and only that one', () => {
    const service = build();
    fail(service, PAIR_LIMIT, ATTACKER, DEMO_STUDENT.email);

    expect(
      service.retryAfter(DEMO_STUDENT.email, ATTACKER, T0 + 10),
    ).toBeGreaterThan(0);
    expect(service.retryAfter(DEMO_STUDENT.email, HOME, T0 + 10)).toBe(0);
  });

  it('does nothing while rate limiting is off, as in the e2e suites', () => {
    const service = build(false);
    fail(service, PAIR_LIMIT * 4);

    expect(service.retryAfter(EMAIL, ATTACKER, T0 + 10)).toBe(0);
  });

  it('keeps a bounded number of keys however many emails are tried', () => {
    const service = build();
    for (let i = 0; i < MAX_KEYS + 50; i += 1) {
      service.recordFailure(`user${i}@example.com`, ATTACKER, T0);
    }
    const internals = service as unknown as {
      pairs: Map<string, unknown>;
      accounts: Map<string, unknown>;
    };

    expect(internals.pairs.size).toBe(MAX_KEYS);
    expect(internals.accounts.size).toBe(MAX_KEYS);
  });
});
