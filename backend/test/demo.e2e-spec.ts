import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AccountStatus, UserRole } from '@prisma/client';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import {
  DEMO_PASSWORD,
  DEMO_STUDENT,
  DEMO_TEACHER,
} from './../src/demo/demo.constants';
import { DemoService } from './../src/demo/demo.service';
import { PrismaService } from './../src/prisma/prisma.service';
import { listenOnLoopback } from './loopback';

/**
 * The public demo (docs/08-development/deployment.md §17.9).
 *
 * Its credentials are published, so what matters is less that it looks right
 * than that it cannot be spoiled or used against anybody: the account-changing
 * routes refuse it, it cannot reach real learners, and the nightly rebuild
 * leaves exactly one demo behind no matter how often it runs.
 */
describe('Public demo (e2e)', () => {
  const REAL_EMAIL = 'demo-e2e-real@example.com';
  const REAL_PASSWORD = 'ValidPass1!';

  let app: INestApplication;
  let prisma: PrismaService;
  let demo: DemoService;

  const login = async (email: string, password: string): Promise<string> => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);
    return (response.body as { accessToken: string }).accessToken;
  };

  beforeAll(async () => {
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
    prisma = app.get(PrismaService);
    demo = app.get(DemoService);

    await prisma.user.deleteMany({ where: { email: REAL_EMAIL } });
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: REAL_EMAIL,
        username: 'demoe2ereal',
        password: REAL_PASSWORD,
      })
      .expect(201);
    await prisma.user.update({
      where: { email: REAL_EMAIL },
      data: { accountStatus: AccountStatus.ACTIVE, role: UserRole.USER },
    });

    await demo.reset();
  }, 180_000);

  afterAll(async () => {
    // Other suites count users and groups; the demo must not outlive this one.
    await demo.clear();
    await prisma.user.deleteMany({ where: { email: REAL_EMAIL } });
    await app.close();
  });

  describe('what it builds', () => {
    it('signs in with the published password and says it is a demo', async () => {
      const token = await login(DEMO_STUDENT.email, DEMO_PASSWORD);
      const me = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect((me.body as { isDemo: boolean }).isDemo).toBe(true);
    });

    it('gives the student a history worth looking at', async () => {
      const token = await login(DEMO_STUDENT.email, DEMO_PASSWORD);
      const auth = { Authorization: `Bearer ${token}` };

      const recent = await request(app.getHttpServer())
        .get('/api/v1/statistics/recent')
        .set(auth)
        .expect(200);
      expect(
        (recent.body as { totalItems: number }).totalItems,
      ).toBeGreaterThanOrEqual(8);

      const mocks = await request(app.getHttpServer())
        .get('/api/v1/quiz/mock-exam/history')
        .set(auth)
        .expect(200);
      expect((mocks.body as unknown[]).length).toBe(2);

      const review = await request(app.getHttpServer())
        .get('/api/v1/quiz/mistake-review')
        .set(auth)
        .expect(200);
      // Old mistakes were moved into the past, so some are due today.
      expect((review.body as { due: number }).due).toBeGreaterThan(0);

      const homework = await request(app.getHttpServer())
        .get('/api/v1/assignments')
        .set(auth)
        .expect(200);
      expect((homework.body as unknown[]).length).toBe(3);

      // Nothing left running: every sitting was handed in.
      const active = await request(app.getHttpServer())
        .get('/api/v1/quiz/active')
        .set(auth)
        .expect(200);
      expect((active.body as { session: unknown }).session).toBeNull();
    });

    it('gives the teacher a class with results to review', async () => {
      const token = await login(DEMO_TEACHER.email, DEMO_PASSWORD);
      const auth = { Authorization: `Bearer ${token}` };

      const groups = await request(app.getHttpServer())
        .get('/api/v1/teacher/groups')
        .set(auth)
        .expect(200);
      const list = groups.body as { id: string; studentCount: number }[];
      expect(list).toHaveLength(1);
      expect(list[0].studentCount).toBe(7);

      const assignments = await request(app.getHttpServer())
        .get(`/api/v1/teacher/groups/${list[0].id}/assignments`)
        .set(auth)
        .expect(200);
      expect((assignments.body as unknown[]).length).toBe(3);
    });

    it('leaves exactly one demo behind however often it runs', async () => {
      const count = () => prisma.user.count({ where: { isDemo: true } });
      const before = await count();

      await demo.reset();

      expect(await count()).toBe(before);
      expect(
        await prisma.group.count({ where: { owner: { isDemo: true } } }),
      ).toBe(1);
    }, 180_000);
  });

  describe('what it refuses', () => {
    it('keeps the password, profile, avatar and the account itself out of reach', async () => {
      const token = await login(DEMO_STUDENT.email, DEMO_PASSWORD);
      const auth = { Authorization: `Bearer ${token}` };

      await request(app.getHttpServer())
        .patch('/api/v1/users/me/password')
        .set(auth)
        .send({ currentPassword: DEMO_PASSWORD, newPassword: 'Another1Pass!' })
        .expect(403);
      await request(app.getHttpServer())
        .patch('/api/v1/users/me/profile')
        .set(auth)
        .send({ displayName: 'Змінене імʼя' })
        .expect(403);
      await request(app.getHttpServer())
        .delete('/api/v1/users/me')
        .set(auth)
        .expect(403);

      // Still signs in with the published password afterwards.
      await login(DEMO_STUDENT.email, DEMO_PASSWORD);
    });

    it('does not let a real learner into the demo class', async () => {
      const teacher = await login(DEMO_TEACHER.email, DEMO_PASSWORD);
      const groups = await request(app.getHttpServer())
        .get('/api/v1/teacher/groups')
        .set('Authorization', `Bearer ${teacher}`)
        .expect(200);
      const inviteCode = (groups.body as { inviteCode: string }[])[0]
        .inviteCode;

      const real = await login(REAL_EMAIL, REAL_PASSWORD);
      await request(app.getHttpServer())
        .post('/api/v1/groups/join')
        .set('Authorization', `Bearer ${real}`)
        .send({ inviteCode })
        .expect(404);
    });

    it('keeps duels between demo and real accounts from happening either way', async () => {
      const subject = await prisma.subject.findUniqueOrThrow({
        where: { slug: 'mathematics' },
        select: { id: true },
      });

      const real = await login(REAL_EMAIL, REAL_PASSWORD);
      await request(app.getHttpServer())
        .post('/api/v1/duels')
        .set('Authorization', `Bearer ${real}`)
        .send({
          opponentUsername: DEMO_STUDENT.username,
          subjectId: subject.id,
        })
        .expect(404);

      const student = await login(DEMO_STUDENT.email, DEMO_PASSWORD);
      await request(app.getHttpServer())
        .post('/api/v1/duels')
        .set('Authorization', `Bearer ${student}`)
        .send({ opponentUsername: 'demoe2ereal', subjectId: subject.id })
        .expect(404);
    });
  });
});
