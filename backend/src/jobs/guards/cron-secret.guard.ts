import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, timingSafeEqual } from 'crypto';
import type { Request } from 'express';
import type { AppConfig } from '../../config/configuration';

/**
 * Lets through the scheduler, and nobody else.
 *
 * Not an administrator's JWT: a token in a GitHub secret would expire in
 * fifteen minutes, and a long-lived one would be an admin account sitting in a
 * CI system. The scheduler gets a secret that can do exactly one thing.
 *
 * Without `CRON_SECRET` the route answers 404 rather than 401 — a deployment
 * that never configured the schedule has no such endpoint, and says so.
 */
@Injectable()
export class CronSecretGuard implements CanActivate {
  constructor(private readonly config: ConfigService<AppConfig, true>) {}

  canActivate(context: ExecutionContext): boolean {
    const secret = this.config.get('cronSecret', { infer: true });
    if (!secret) {
      throw new NotFoundException();
    }

    const header = context.switchToHttp().getRequest<Request>()
      .headers.authorization;
    const presented = header?.startsWith('Bearer ') ? header.slice(7) : '';
    if (!sameSecret(presented, secret)) {
      throw new UnauthorizedException();
    }
    return true;
  }
}

/**
 * Constant-time comparison. Both sides are hashed first so they are the same
 * length — `timingSafeEqual` throws otherwise, and an early length check would
 * itself leak the secret's length.
 */
function sameSecret(presented: string, expected: string): boolean {
  const digest = (value: string): Buffer =>
    createHash('sha256').update(value).digest();
  return timingSafeEqual(digest(presented), digest(expected));
}
