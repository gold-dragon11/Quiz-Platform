import {
  ExecutionContext,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppConfig } from '../../config/configuration';
import { CronSecretGuard } from './cron-secret.guard';

const SECRET = 'a-scheduler-secret-of-comfortable-length';

const guardWith = (secret: string | undefined): CronSecretGuard =>
  new CronSecretGuard({
    get: () => secret,
  } as unknown as ConfigService<AppConfig, true>);

const requestWith = (authorization?: string): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({ headers: { authorization } }),
    }),
  }) as unknown as ExecutionContext;

describe('CronSecretGuard', () => {
  it('lets the scheduler through with the configured secret', () => {
    expect(guardWith(SECRET).canActivate(requestWith(`Bearer ${SECRET}`))).toBe(
      true,
    );
  });

  it('rejects a wrong secret, a missing header and a bare secret', () => {
    const guard = guardWith(SECRET);
    for (const header of [
      `Bearer ${SECRET}x`,
      `Bearer ${SECRET.slice(1)}`,
      undefined,
      SECRET,
      'Bearer ',
    ]) {
      expect(() => guard.canActivate(requestWith(header))).toThrow(
        UnauthorizedException,
      );
    }
  });

  it('has no route to guard when no secret is configured', () => {
    // Not 401: an empty secret must never be a secret that an empty header
    // matches.
    for (const secret of [undefined, '']) {
      expect(() =>
        guardWith(secret).canActivate(requestWith('Bearer ')),
      ).toThrow(NotFoundException);
    }
  });
});
