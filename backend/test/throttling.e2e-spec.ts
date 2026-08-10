import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from './../src/app.module';

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

  beforeAll(async () => {
    process.env.THROTTLE_ENABLED = 'true';

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
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    if (previous === undefined) {
      delete process.env.THROTTLE_ENABLED;
    } else {
      process.env.THROTTLE_ENABLED = previous;
    }
  });

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

  it('leaves the health check unthrottled so probes cannot be locked out', async () => {
    // Past the global allowance, not merely inside it: the endpoint opts out
    // via @SkipThrottle, so no request count should ever reject a probe.
    for (let i = 0; i < 150; i += 1) {
      const response = await request(app.getHttpServer()).get('/health');
      expect(response.status).not.toBe(429);
    }
  });
});
