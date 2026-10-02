import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AccountStatus, UserRole } from '@prisma/client';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { listenOnLoopback } from './loopback';
import type { PlatformMetrics } from './../src/metrics/metrics.types';

/**
 * The administrator's overview (docs/04-api/admin.md §8).
 *
 * Two things are worth testing here and the rest is arithmetic: that nobody
 * but an administrator can read how the platform is doing, and that the
 * figures leave out the accounts that would otherwise drown them — the demo's,
 * rebuilt nightly with tests of their own, and the ones belonging to people
 * who left.
 */
describe('Admin metrics (e2e)', () => {
  const EMAIL_PREFIX = 'metrics-e2e';
  const USERNAME_PREFIX = 'metricse2e';
  const PASSWORD = 'ValidPass1!';
  const METRICS_URL = '/api/v1/admin/metrics';

  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let learnerToken: string;
  let counter = 0;

  const registerAccount = async (
    role: UserRole,
  ): Promise<{ token: string; email: string }> => {
    counter += 1;
    const email = `${EMAIL_PREFIX}-${counter}@example.com`;

    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email,
        username: `${USERNAME_PREFIX}${counter}`,
        password: PASSWORD,
      })
      .expect(201);

    await prisma.user.update({
      where: { email },
      data: { accountStatus: AccountStatus.ACTIVE, role },
    });

    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: PASSWORD })
      .expect(200);

    return {
      token: (response.body as { accessToken: string }).accessToken,
      email,
    };
  };

  const overview = async (): Promise<PlatformMetrics> => {
    const response = await request(app.getHttpServer())
      .get(METRICS_URL)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    return response.body as PlatformMetrics;
  };

  const removeTestData = async (): Promise<void> => {
    await prisma.user.deleteMany({
      where: { email: { startsWith: EMAIL_PREFIX } },
    });
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.setGlobalPrefix('api/v1', { exclude: ['health'] });
    await listenOnLoopback(app);

    prisma = app.get(PrismaService);
    await removeTestData();

    adminToken = (await registerAccount(UserRole.ADMIN)).token;
    learnerToken = (await registerAccount(UserRole.USER)).token;
  });

  afterAll(async () => {
    await removeTestData();
    await app.close();
  });

  describe('who may read it', () => {
    it('refuses anyone who is not signed in', async () => {
      await request(app.getHttpServer()).get(METRICS_URL).expect(401);
    });

    it('refuses a learner, who must not see how many people the platform has', async () => {
      await request(app.getHttpServer())
        .get(METRICS_URL)
        .set('Authorization', `Bearer ${learnerToken}`)
        .expect(403);
    });

    it('lets an administrator in', async () => {
      await request(app.getHttpServer())
        .get(METRICS_URL)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });

  describe('what it reports', () => {
    it('answers with every panel the overview draws', async () => {
      const metrics = await overview();

      expect(Object.keys(metrics).sort()).toEqual([
        'funnel',
        'recent',
        'registrations',
        'subjects',
        'today',
        'totals',
        'week',
      ]);
    });

    it('gives the chart one point per day, gaps included', async () => {
      const { registrations } = await overview();

      // Thirty columns whatever happened, so a quiet fortnight stays a flat
      // stretch rather than being closed up into a gentle slope.
      expect(registrations).toHaveLength(30);
      expect(registrations[0].day < registrations[29].day).toBe(true);
      for (const point of registrations) {
        expect(point.day).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    });

    it('keeps the funnel narrowing, step by step', async () => {
      const { funnel } = await overview();

      // Each step is a subset of the one above it. A funnel that widens means
      // the steps were counted over different cohorts.
      expect(funnel.registered).toBeGreaterThanOrEqual(funnel.verified);
      expect(funnel.verified).toBeGreaterThanOrEqual(funnel.tookATest);
      expect(funnel.tookATest).toBeGreaterThanOrEqual(funnel.returned);
    });
  });

  describe('who is left out', () => {
    it('counts no demo account, however many the nightly rebuild makes', async () => {
      const before = await overview();

      // Built here rather than assumed: the demo is made by a scheduled job,
      // so a test database may have none at all, and a test that passes
      // against an empty fixture is not testing the rule.
      const { email } = await registerAccount(UserRole.USER);
      await prisma.user.update({ where: { email }, data: { isDemo: true } });

      const after = await overview();

      expect(after.totals.accounts).toBe(before.totals.accounts);
      expect(after.recent).toHaveLength(before.recent.length);
    });

    it('stops counting an account once its owner has deleted it', async () => {
      const { email } = await registerAccount(UserRole.USER);
      const before = await overview();

      await prisma.user.update({
        where: { email },
        data: { accountStatus: AccountStatus.DELETED },
      });

      const after = await overview();

      // A soft delete keeps the row so history survives and the username stays
      // reserved. A figure whose only job is to convey scale should not keep
      // counting somebody who left.
      expect(after.totals.accounts).toBe(before.totals.accounts - 1);
    });
  });
});
