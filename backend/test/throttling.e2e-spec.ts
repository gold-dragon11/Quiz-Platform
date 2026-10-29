import { INestApplication, ValidationPipe } from '@nestjs/common';
import type { App } from 'supertest/types';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { AccountStatus } from '@prisma/client';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { LOGIN_LOCKED_MESSAGE } from './../src/auth/errors/login-locked.exception';
import { PasswordUtil } from './../src/auth/utils/password.util';
import { PrismaService } from './../src/prisma/prisma.service';
import { listenOnLoopback } from './loopback';

/**
 * Rate limiting (docs/06-backend/security.md, "Rate Limiting").
 *
 * Every other e2e suite runs with the limiter switched off — 500-odd tests
 * from one address would trip it for reasons unrelated to what they assert.
 * That leaves the limiter itself untested, which is the dangerous state for a
 * control of this kind: misconfigured too tight it locks out real users, and
 * misconfigured too loose it silently protects nothing. This suite is the one
 * place it runs armed.
 *
 * `THROTTLE_ENABLED` is set before the module is built because the config
 * factory reads `process.env` at construction time.
 */
describe('Rate limiting (e2e)', () => {
  let app: INestApplication<App>;
  const previous = process.env.THROTTLE_ENABLED;
  const previousLimit = process.env.THROTTLE_LIMIT;
  // A small per-person allowance, so the tests reach it in a few requests.
  const PERSON_LIMIT = 20;

  beforeAll(async () => {
    process.env.THROTTLE_ENABLED = 'true';
    process.env.THROTTLE_LIMIT = String(PERSON_LIMIT);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.setGlobalPrefix('api/v1', { exclude: ['health'] });
    await listenOnLoopback(app);
  });

  afterAll(async () => {
    await app
      .get(PrismaService)
      .user.deleteMany({ where: { email: { startsWith: 'throttle-owner' } } });
    await app.close();
    if (previous === undefined) {
      delete process.env.THROTTLE_ENABLED;
    } else {
      process.env.THROTTLE_ENABLED = previous;
    }
    if (previousLimit === undefined) {
      delete process.env.THROTTLE_LIMIT;
    } else {
      process.env.THROTTLE_LIMIT = previousLimit;
    }
  });

  /** Statuses of `count` requests made in a row. */
  const burst = async (
    count: number,
    send: () => request.Test,
  ): Promise<number[]> => {
    const statuses: number[] = [];
    for (let i = 0; i < count; i += 1) {
      statuses.push((await send()).status);
    }
    return statuses;
  };

  /** A token signed with the app's own secret, for a user the DB need not hold. */
  const tokenFor = (sub: string): string =>
    app.get(JwtService, { strict: false }).sign({ sub });

  /** Wrong credentials on purpose: the limit must apply to failures. */
  const attemptLogin = (): request.Test =>
    request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'throttle-probe@example.com', password: 'WrongPass1!' });

  it('locks an address out of one account after five failed attempts', async () => {
    const statuses = await burst(7, attemptLogin);

    // The attempts themselves reach the handler and fail on the credentials;
    // only the ones after the fifth failure are turned away (decision 44).
    expect(statuses.slice(0, 5)).toEqual([401, 401, 401, 401, 401]);
    expect(statuses.slice(5)).toEqual([429, 429]);
  });

  it('answers a locked sign-in with how long to wait', async () => {
    const response = await attemptLogin();

    expect(response.status).toBe(429);
    const wait = Number(response.headers['retry-after']);
    expect(wait).toBeGreaterThan(0);
    expect(wait).toBeLessThanOrEqual(15 * 60);
  });

  it('says so in Ukrainian, without a number that would pace the guessing', async () => {
    const body = (await attemptLogin()).body as { message: string };

    expect(body.message).toBe(LOGIN_LOCKED_MESSAGE);
    expect(body.message).not.toMatch(/\d/);
  });

  it('counts signed-in people from one address separately', async () => {
    const me = (token: string) => () =>
      request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);

    // The user need not exist: the limiter runs before authentication and
    // counts by the verified token, so these are 401s until the allowance ends.
    const first = await burst(PERSON_LIMIT + 1, me(tokenFor('throttle-a')));
    expect(first.slice(0, PERSON_LIMIT)).not.toContain(429);
    expect(first[PERSON_LIMIT]).toBe(429);

    // A classmate on the same address still has their own allowance.
    const classmate = await me(tokenFor('throttle-b'))();
    expect(classmate.status).not.toBe(429);
  });

  it('does not give a forged token an allowance of its own', async () => {
    // Signed with another secret, each with a different made-up user: all of
    // them fall back to the one address, so they are counted together.
    const forged = new JwtService({
      secret: 'not-the-app-secret-at-all-xxxxxxxx',
    });
    const statuses: number[] = [];
    let last: request.Response | undefined;
    for (let i = 0; i <= PERSON_LIMIT; i += 1) {
      last = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${forged.sign({ sub: `fake-${i}` })}`);
      statuses.push(last.status);
    }
    expect(statuses[PERSON_LIMIT]).toBe(429);
    // The frontend renders the server's message verbatim, so the default
    // `ThrottlerException: Too Many Requests` would surface to the user, and
    // a count of what remains would tell an attacker their budget.
    const message = (last?.body as { message: string }).message;
    expect(message).toBe(
      'Забагато запитів. Зачекайте трохи та спробуйте ще раз.',
    );
    expect(message).not.toMatch(/\d/);
  });

  it('limits login attempts per account, not for the whole address', async () => {
    const loginAs = (email: string) => () =>
      request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password: 'WrongPass1!' });

    const target = await burst(6, loginAs('throttle-target@example.com'));
    expect(target[5]).toBe(429);

    // The next person in the room is not locked out by someone else's typos.
    const neighbour = await loginAs('throttle-neighbour@example.com')();
    expect(neighbour.status).toBe(401);
  });

  it('lets a correct password clear the failures on the account', async () => {
    // Created in the database rather than through /auth/register: that route
    // has its own allowance per address, which the next test measures.
    const owner = {
      email: 'throttle-owner@example.com',
      password: 'RightPass1!',
    };
    await app.get(PrismaService).user.create({
      data: {
        email: owner.email,
        passwordHash: await app.get(PasswordUtil).hashPassword(owner.password),
        accountStatus: AccountStatus.ACTIVE,
        emailVerified: true,
      },
    });
    const wrong = () =>
      request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: owner.email, password: 'WrongPass1!' });

    expect(await burst(4, wrong)).toEqual([401, 401, 401, 401]);
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: owner.email, password: owner.password })
      .expect(200);

    // Without the reset the fifth of these would already be turned away: the
    // count began again, so five more fail on the password and only then the
    // address waits.
    expect(await burst(6, wrong)).toEqual([401, 401, 401, 401, 401, 429]);
  });

  it('lets a class of thirty-five register from one address', async () => {
    // An invalid body on purpose: the limiter counts before validation, so
    // this measures the allowance without creating accounts.
    const register = () =>
      request(app.getHttpServer()).post('/api/v1/auth/register').send({});

    const statuses = await burst(41, register);
    expect(statuses.slice(0, 40).every((status) => status === 400)).toBe(true);
    expect(statuses[40]).toBe(429);
  });

  it('leaves the health check unthrottled so probes cannot be locked out', async () => {
    // Past the global allowance, not merely inside it: the endpoint opts out
    // via @SkipThrottle, so no request count should ever reject a probe.
    for (let i = 0; i < 150; i += 1) {
      const response = await request(app.getHttpServer()).get('/health');
      expect(response.status).not.toBe(429);
    }
  });
});
