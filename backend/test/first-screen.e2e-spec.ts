import { INestApplication, ValidationPipe } from '@nestjs/common';
import type { App } from 'supertest/types';
import { Test, TestingModule } from '@nestjs/testing';
import { AccountStatus, UserRole } from '@prisma/client';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { listenOnLoopback } from './loopback';

interface StudyBody {
  subjectIds: string[];
  needsOnboarding: boolean;
}

/**
 * The first screen (docs/04-api/users.md §13): which subjects a new learner
 * takes, and the flag that decides whether the dashboard asks.
 */
describe('First screen (e2e)', () => {
  const EMAIL_PREFIX = 'first-screen';
  const SLUG_PREFIX = 'first-screen-';
  const PASSWORD = 'ValidPass1!';
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let counter = 0;
  let maths: string;
  let history: string;
  let hidden: string;

  const register = async (): Promise<{ token: string; userId: string }> => {
    counter += 1;
    const email = `${EMAIL_PREFIX}-${counter}@example.com`;
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, username: `firstscreen${counter}`, password: PASSWORD })
      .expect(201);
    const user = await prisma.user.update({
      where: { email },
      data: { accountStatus: AccountStatus.ACTIVE },
      select: { id: true },
    });
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: PASSWORD })
      .expect(200);
    return {
      token: (login.body as { accessToken: string }).accessToken,
      userId: user.id,
    };
  };

  const getStudy = (token: string): request.Test =>
    request(app.getHttpServer())
      .get('/api/v1/users/me/study')
      .set('Authorization', `Bearer ${token}`);

  const putStudy = (token: string, body: unknown): request.Test =>
    request(app.getHttpServer())
      .put('/api/v1/users/me/study')
      .set('Authorization', `Bearer ${token}`)
      .send(body as object);

  const createSubject = async (
    slug: string,
    isPublished: boolean,
  ): Promise<string> => {
    const subject = await prisma.subject.create({
      data: {
        name: slug,
        slug: `${SLUG_PREFIX}${slug}`,
        isPublished,
        displayOrder: 900,
      },
      select: { id: true },
    });
    return subject.id;
  };

  const removeTestData = async (): Promise<void> => {
    await prisma.user.deleteMany({
      where: { email: { startsWith: EMAIL_PREFIX } },
    });
    await prisma.subject.deleteMany({
      where: { slug: { startsWith: SLUG_PREFIX } },
    });
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
    await removeTestData();
    maths = await createSubject('maths', true);
    history = await createSubject('history', true);
    hidden = await createSubject('hidden', false);
  });

  afterAll(async () => {
    await removeTestData();
    await app.close();
  });

  it('rejects an anonymous caller', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/users/me/study')
      .expect(401);
    await request(app.getHttpServer())
      .put('/api/v1/users/me/study')
      .send({ subjectIds: [] })
      .expect(401);
  });

  it('asks a learner who has just registered', async () => {
    const { token } = await register();

    const res = await getStudy(token).expect(200);

    expect(res.body as StudyBody).toEqual({
      subjectIds: [],
      needsOnboarding: true,
    });
  });

  it('keeps the subjects in the order they were chosen and stops asking', async () => {
    const { token } = await register();

    const put = await putStudy(token, { subjectIds: [history, maths] }).expect(
      200,
    );

    expect(put.body as StudyBody).toEqual({
      subjectIds: [history, maths],
      needsOnboarding: false,
    });
    const res = await getStudy(token).expect(200);
    expect((res.body as StudyBody).subjectIds).toEqual([history, maths]);
  });

  it('replaces the earlier answer rather than adding to it', async () => {
    const { token } = await register();
    await putStudy(token, { subjectIds: [history, maths] }).expect(200);

    const res = await putStudy(token, { subjectIds: [maths] }).expect(200);

    expect((res.body as StudyBody).subjectIds).toEqual([maths]);
  });

  it('takes an empty list as «skip»: no subjects, and the screen is not offered again', async () => {
    const { token } = await register();

    const res = await putStudy(token, { subjectIds: [] }).expect(200);

    expect(res.body as StudyBody).toEqual({
      subjectIds: [],
      needsOnboarding: false,
    });
  });

  it('refuses a subject that is unpublished or unknown, and changes nothing', async () => {
    const { token, userId } = await register();

    await putStudy(token, { subjectIds: [maths, hidden] }).expect(400);
    await putStudy(token, {
      subjectIds: ['00000000-0000-4000-8000-000000000000'],
    }).expect(400);
    await putStudy(token, { subjectIds: ['maths'] }).expect(400);
    await putStudy(token, {}).expect(400);

    expect(await prisma.studySubject.count({ where: { userId } })).toBe(0);
    expect(
      ((await getStudy(token).expect(200)).body as StudyBody).needsOnboarding,
    ).toBe(true);
  });

  it('does not ask a learner who has already finished a test', async () => {
    const { token, userId } = await register();
    await prisma.statistics.upsert({
      where: { userId },
      update: { totalQuizzes: 1 },
      create: { userId, totalQuizzes: 1 },
    });

    const res = await getStudy(token).expect(200);

    expect((res.body as StudyBody).needsOnboarding).toBe(false);
  });

  it('does not ask a teacher', async () => {
    const { token, userId } = await register();
    await prisma.user.update({
      where: { id: userId },
      data: { role: UserRole.TEACHER },
    });

    const res = await getStudy(token).expect(200);

    expect((res.body as StudyBody).needsOnboarding).toBe(false);
  });
});
