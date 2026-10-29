import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../../config/configuration';
import {
  DEMO_CLASSMATES,
  DEMO_STUDENT,
  DEMO_TEACHER,
} from '../../demo/demo.constants';
import { OwnerAlertsService } from '../../owner-alerts/owner-alerts.service';

const MINUTE = 60_000;

/** Failed attempts one address may make on one account before it waits. */
export const PAIR_LIMIT = 5;
/** The window those failures are counted in, and the wait that follows. */
export const PAIR_WINDOW_MS = 15 * MINUTE;
/** Failed attempts on one account from every address together, per hour. */
export const ACCOUNT_LIMIT = 50;
export const ACCOUNT_WINDOW_MS = 60 * MINUTE;
/** Keys kept at most; the oldest go first. A flood cannot grow the map. */
export const MAX_KEYS = 20_000;

/**
 * The public demo accounts: their password is printed on the landing page,
 * so guessing it is pointless, and a ceiling on them would let anybody with a
 * script switch the demo off for every visitor.
 */
const DEMO_EMAILS = new Set(
  [DEMO_STUDENT, DEMO_TEACHER, ...DEMO_CLASSMATES].map((account) =>
    account.email.toLowerCase(),
  ),
);

interface Pair {
  failures: number[];
  lockedUntil: number;
}

interface Account {
  failures: number[];
  alerted: boolean;
}

/**
 * Failed sign-ins, and when they stop being answered (decision 44).
 *
 * The rate limiter counted every request to /auth/login per email, from any
 * address, ten a minute. That let anybody lock a person out by sending ten
 * wrong passwords for their email, and the demo accounts, whose credentials
 * are public, could be switched off for everyone the same way.
 *
 * Here only failures count, a correct password clears them, and the lock
 * falls on the pair of email and address: five failures in fifteen minutes
 * and that address waits fifteen minutes on that account. Whoever is guessing
 * locks out themselves; the owner signing in from their own phone does not
 * notice. Across all addresses an account takes fifty failures an hour before
 * it stops answering, which only a distributed attack reaches, and that sends
 * the owner a message. The demo accounts have no such ceiling.
 *
 * Counted in memory: the API runs as one instance, and a restart forgetting
 * a quarter of an hour of failures costs nothing. Two instances would need
 * the counts in a shared store.
 *
 * Off when the rate limiter is off, which is how the e2e suites run: they
 * send wrong passwords on purpose and are not testing this.
 */
@Injectable()
export class LoginAttemptsService {
  private readonly pairs = new Map<string, Pair>();
  private readonly accounts = new Map<string, Account>();
  private readonly enabled: boolean;

  constructor(
    configService: ConfigService<AppConfig, true>,
    private readonly ownerAlerts: OwnerAlertsService,
  ) {
    this.enabled = configService.get('throttle', { infer: true }).enabled;
  }

  /**
   * Seconds this address must wait before trying this account again, or 0.
   * Asked before the password is checked, so a locked attempt costs no hash.
   */
  retryAfter(email: string, address: string, now = Date.now()): number {
    if (!this.enabled) {
      return 0;
    }
    const pair = this.pairs.get(pairKey(email, address));
    if (pair && pair.lockedUntil > now) {
      return Math.ceil((pair.lockedUntil - now) / 1000);
    }
    const account = this.accounts.get(normalise(email));
    if (account && !isDemo(email)) {
      const recent = within(account.failures, now, ACCOUNT_WINDOW_MS);
      if (recent.length >= ACCOUNT_LIMIT) {
        return Math.ceil((recent[0] + ACCOUNT_WINDOW_MS - now) / 1000);
      }
    }
    return 0;
  }

  /** A wrong password, or an email that has no account: counted the same. */
  recordFailure(email: string, address: string, now = Date.now()): void {
    if (!this.enabled) {
      return;
    }
    const key = pairKey(email, address);
    const pair = this.pairs.get(key) ?? { failures: [], lockedUntil: 0 };
    pair.failures = [...within(pair.failures, now, PAIR_WINDOW_MS), now];
    if (pair.failures.length >= PAIR_LIMIT) {
      pair.lockedUntil = now + PAIR_WINDOW_MS;
      pair.failures = [];
    }
    remember(this.pairs, key, pair);

    const accountKey = normalise(email);
    const account = this.accounts.get(accountKey) ?? {
      failures: [],
      alerted: false,
    };
    account.failures = [
      ...within(account.failures, now, ACCOUNT_WINDOW_MS),
      now,
    ];
    if (account.failures.length < ACCOUNT_LIMIT) {
      account.alerted = false;
    } else if (!account.alerted && !isDemo(email)) {
      account.alerted = true;
      void this.ownerAlerts.announceLoginPressure(accountKey);
    }
    remember(this.accounts, accountKey, account);
  }

  /**
   * The owner proved who they are, by password or by a reset link: every
   * count on the account goes, from every address.
   */
  forget(email: string): void {
    const accountKey = normalise(email);
    this.accounts.delete(accountKey);
    for (const key of this.pairs.keys()) {
      if (key.startsWith(`${accountKey}\n`)) {
        this.pairs.delete(key);
      }
    }
  }
}

function normalise(email: string): string {
  return email.trim().toLowerCase();
}

function pairKey(email: string, address: string): string {
  return `${normalise(email)}\n${address}`;
}

function isDemo(email: string): boolean {
  return DEMO_EMAILS.has(normalise(email));
}

function within(times: number[], now: number, window: number): number[] {
  return times.filter((time) => time > now - window);
}

/** Re-inserts so the map keeps the most recently touched keys last. */
function remember<T>(map: Map<string, T>, key: string, value: T): void {
  map.delete(key);
  map.set(key, value);
  while (map.size > MAX_KEYS) {
    const oldest = map.keys().next().value;
    if (oldest === undefined) {
      break;
    }
    map.delete(oldest);
  }
}
