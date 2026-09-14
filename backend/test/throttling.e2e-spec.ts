import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from './../src/app.module';
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
  let app: INestApplication;
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

  it('rejects a burst of login attempts with 429 once the limit is passed', async () => {
    const LOGIN_LIMIT = 10;
    const statuses: number[] = [];

    for (let i = 0; i < LOGIN_LIMIT + 2; i += 1) {
      statuses.push((await attemptLogin()).status);
    }

    // The allowance itself must not be spent by the limiter: the first ten
    // attempts reach the handler and fail on the credentials, not on 429.
    expect(statuses.slice(0, LOGIN_LIMIT).every((s) => s === 401)).toBe(true);
    expect(statuses.slice(LOGIN_LIMIT)).toEqual([429, 429]);
  });

  it('answers 429 with a retry hint rather than a bare rejection', async () => {
    const response = await attemptLogin();

    expect(response.status).toBe(429);
    expect(response.headers['retry-after']).toBeDefined();
  });

  it('rejects in Ukrainian, without naming the exception or the limit', async () => {
    const body = (await attemptLogin()).body as { message: string };

    // The frontend renders the server's message verbatim, so the default
    // `ThrottlerException: Too Many Requests` would surface to the user.
    expect(body.message).toBe(
      'Забагато запитів. Зачекайте трохи та спробуйте ще раз.',
    );
    // Saying how many attempts remain would tell an attacker their budget.
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
    for (let i = 0; i <= PERSON_LIMIT; i += 1) {
      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${forged.sign({ sub: `fake-${i}` })}`);
      statuses.push(response.status);
    }
    expect(statuses[PERSON_LIMIT]).toBe(429);
  });

  it('limits login attempts per account, not for the whole address', async () => {
    const loginAs = (email: string) => () =>
      request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password: 'WrongPass1!' });

    const target = await burst(11, loginAs('throttle-target@example.com'));
    expect(target[10]).toBe(429);

    // The next person in the room is not locked out by someone else's typos.
    const neighbour = await loginAs('throttle-neighbour@example.com')();
    expect(neighbour.status).toBe(401);
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
