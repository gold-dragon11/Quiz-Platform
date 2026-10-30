import { INestApplication, ValidationPipe } from '@nestjs/common';
import type { App } from 'supertest/types';
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

  let app: INestApplication<App>;
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
    // Sessions first: a user with sessions cannot be deleted (Restrict), and
    // their answers go with them (Cascade).
    await prisma.quizSession.deleteMany({
      where: { user: { email: { startsWith: EMAIL_PREFIX } } },
    });
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
        'returns',
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

  /**
   * Weekly cohorts of new learners and whether they answered anything the
   * next day and in their second week. The database holds other people's
   * rows, so every test reads the change its own learners make to one week.
   */
  describe('who comes back', () => {
    /** Today in Kyiv, `YYYY-MM-DD`: the days the metric counts in. */
    const kyivToday = (): string =>
      new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Europe/Kyiv',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date());
    const addDays = (day: string, days: number): string => {
      const date = new Date(`${day}T00:00:00Z`);
      date.setUTCDate(date.getUTCDate() + days);
      return date.toISOString().slice(0, 10);
    };
    const mondayOf = (day: string): string =>
      addDays(day, -((new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7));
    /** Late morning in Kyiv on that day, whatever the season's offset. */
    const onDay = (day: string): Date => new Date(`${day}T09:00:00Z`);

    // Three weeks back: old enough that both the next day and the second
    // week are over, so both shares can be decided.
    const WEEK = addDays(mondayOf(kyivToday()), -21);

    let question: { id: string; subjectId: string };

    beforeAll(async () => {
      const found = await prisma.question.findFirstOrThrow({
        select: { id: true, topic: { select: { subjectId: true } } },
      });
      question = { id: found.id, subjectId: found.topic.subjectId };
    });

    /** A learner who registered on `day`, confirmed, with answers on `answeredOn`. */
    const learner = async (
      day: string,
      answeredOn: string[],
      options: { role?: UserRole; verified?: boolean } = {},
    ): Promise<void> => {
      const { email } = await registerAccount(options.role ?? UserRole.USER);
      const user = await prisma.user.update({
        where: { email },
        data: {
          createdAt: onDay(day),
          emailVerified: options.verified ?? true,
        },
      });
      for (const answered of answeredOn) {
        await prisma.quizSession.create({
          data: {
            userId: user.id,
            subjectId: question.subjectId,
            mode: 'SUBJECT_QUIZ',
            timerEnabled: false,
            questionCount: 1,
            attempts: {
              create: {
                questionId: question.id,
                isCorrect: true,
                answeredAt: onDay(answered),
              },
            },
          },
        });
      }
    };

    const weekOf = (metrics: PlatformMetrics, week: string) => {
      const found = metrics.returns.find((cohort) => cohort.week === week);
      if (!found) throw new Error(`no cohort for ${week}`);
      return found;
    };

    it('lists eight weeks, oldest first, each starting on a Monday', async () => {
      const { returns } = await overview();

      expect(returns).toHaveLength(8);
      expect(returns[7].week).toBe(mondayOf(kyivToday()));
      for (const cohort of returns) {
        expect(new Date(`${cohort.week}T00:00:00Z`).getUTCDay()).toBe(1);
      }
    });

    it('counts who answered on the day after registering, and only that day', async () => {
      const before = weekOf(await overview(), WEEK);

      await learner(WEEK, [addDays(WEEK, 1)]);
      await learner(WEEK, [addDays(WEEK, 2)]);
      await learner(WEEK, []);

      const after = weekOf(await overview(), WEEK);
      expect(after.size - before.size).toBe(3);
      expect(after.nextDay.of - before.nextDay.of).toBe(3);
      expect(after.nextDay.returned - before.nextDay.returned).toBe(1);
    });

    it('counts the second week as days seven to thirteen', async () => {
      const before = weekOf(await overview(), WEEK);

      await learner(WEEK, [addDays(WEEK, 7)]);
      await learner(WEEK, [addDays(WEEK, 13)]);
      await learner(WEEK, [addDays(WEEK, 6), addDays(WEEK, 14)]);

      const after = weekOf(await overview(), WEEK);
      expect(after.secondWeek.of - before.secondWeek.of).toBe(3);
      expect(after.secondWeek.returned - before.secondWeek.returned).toBe(2);
    });

    it('does not judge a learner whose next day is not over yet', async () => {
      const today = kyivToday();
      const thisWeek = mondayOf(today);
      const before = weekOf(await overview(), thisWeek);

      await learner(today, []);

      const after = weekOf(await overview(), thisWeek);
      expect(after.size - before.size).toBe(1);
      // Counted as «not returned» it would make every young week look like a
      // failure; it waits until the next day has passed.
      expect(after.nextDay.of - before.nextDay.of).toBe(0);
    });

    it('leaves out teachers and learners who never confirmed their email', async () => {
      const before = weekOf(await overview(), WEEK);

      await learner(WEEK, [addDays(WEEK, 1)], { role: UserRole.TEACHER });
      await learner(WEEK, [addDays(WEEK, 1)], { verified: false });

      const after = weekOf(await overview(), WEEK);
      expect(after.size).toBe(before.size);
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
