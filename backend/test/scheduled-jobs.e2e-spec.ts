import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  AccountStatus,
  QuestionType,
  QuizStatus,
  QuizType,
} from '@prisma/client';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { NotificationsService } from './../src/notifications/services/notifications.service';
import { PrismaService } from './../src/prisma/prisma.service';
import { listenOnLoopback } from './loopback';

const CRON_SECRET = 'e2e-only-cron-secret-not-a-real-credential';
const DAY = 24 * 60 * 60 * 1000;
const ago = (ms: number): Date => new Date(Date.now() - ms);

/**
 * Reminders have their own suite (assignment-notifications); here they only
 * need to be switchable into failing, to show one broken step does not stop
 * the others.
 */
class SwitchableNotifications {
  failing = false;

  sendDueReminders(): Promise<number> {
    return this.failing
      ? Promise.reject(new Error('provider down'))
      : Promise.resolve(0);
  }

  assignmentIssued(): Promise<number> {
    return Promise.resolve(0);
  }
}

/**
 * The hourly sweep (decision 23, docs/08-development/deployment.md §17.7).
 *
 * What matters is what it must not do: take away work somebody is still doing,
 * score a session nobody finished, or do anything twice.
 */
describe('Scheduled jobs (e2e)', () => {
  const PREFIX = 'jobs-e2e';
  const PASSWORD = 'ValidPass1!';
  const SWEEP_URL = '/api/v1/jobs/hourly';
  const previousSecret = process.env.CRON_SECRET;

  let app: INestApplication;
  let prisma: PrismaService;
  let notifications: SwitchableNotifications;
  let subjectId: string;
  let topicId: string;
  let questionIds: string[] = [];
  let userId: string;
  let token: string;

  const sweep = () =>
    request(app.getHttpServer())
      .post(SWEEP_URL)
      .set('Authorization', `Bearer ${CRON_SECRET}`);

  const createSession = async (params: {
    startedAt: Date;
    expiresAt?: Date;
  }): Promise<string> => {
    const session = await prisma.quizSession.create({
      data: {
        userId,
        subjectId,
        topicId,
        mode: QuizType.SUBJECT_QUIZ,
        timerEnabled: params.expiresAt !== undefined,
        questionCount: questionIds.length,
        status: QuizStatus.ACTIVE,
        startedAt: params.startedAt,
        expiresAt: params.expiresAt ?? null,
        questions: {
          create: questionIds.map((questionId, position) => ({
            questionId,
            position,
          })),
        },
      },
      select: { id: true },
    });
    return session.id;
  };

  const statusOf = async (sessionId: string): Promise<QuizStatus> =>
    (
      await prisma.quizSession.findUniqueOrThrow({
        where: { id: sessionId },
        select: { status: true },
      })
    ).status;

  const removeSessions = async (): Promise<void> => {
    const sessions = await prisma.quizSession.findMany({
      where: { userId },
      select: { id: true },
    });
    const ids = sessions.map((session) => session.id);
    await prisma.xPTransaction.deleteMany({ where: { userId } });
    await prisma.mistakeReview.deleteMany({ where: { userId } });
    await prisma.questionAttempt.deleteMany({
      where: { quizSessionId: { in: ids } },
    });
    await prisma.result.deleteMany({ where: { quizSessionId: { in: ids } } });
    await prisma.quizSessionQuestion.deleteMany({
      where: { quizSessionId: { in: ids } },
    });
    await prisma.quizSession.deleteMany({ where: { id: { in: ids } } });
  };

  beforeAll(async () => {
    // Read when the module is built, like every other variable.
    process.env.CRON_SECRET = CRON_SECRET;
    notifications = new SwitchableNotifications();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(NotificationsService)
      .useValue(notifications)
      .compile();

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

    const subject = await prisma.subject.upsert({
      where: { slug: PREFIX },
      update: { isPublished: true, deletedAt: null },
      create: {
        name: 'Jobs fixture',
        slug: PREFIX,
        displayOrder: 9920,
        isPublished: true,
      },
      select: { id: true },
    });
    subjectId = subject.id;
    const topic = await prisma.topic.upsert({
      where: { subjectId_slug: { subjectId, slug: PREFIX } },
      update: { isPublished: true, deletedAt: null },
      create: {
        subjectId,
        name: 'Тема',
        slug: PREFIX,
        displayOrder: 1,
        isPublished: true,
      },
      select: { id: true },
    });
    topicId = topic.id;

    const email = `${PREFIX}@example.com`;
    const stale = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (stale) {
      userId = stale.id;
      await removeSessions();
      await prisma.user.delete({ where: { id: stale.id } });
    }
    await prisma.question.deleteMany({ where: { topicId } });

    questionIds = [];
    for (let index = 0; index < 2; index += 1) {
      const question = await prisma.question.create({
        data: {
          topicId,
          type: QuestionType.SINGLE_CHOICE,
          title: `Питання ${index}`,
          isPublished: true,
          answerOptions: {
            create: [
              { content: 'Правильна', order: 0, isCorrect: true },
              { content: 'Хибна', order: 1, isCorrect: false },
            ],
          },
        },
        select: { id: true },
      });
      questionIds.push(question.id);
    }

    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, username: 'jobse2e', password: PASSWORD })
      .expect(201);
    userId = (
      await prisma.user.update({
        where: { email },
        data: { accountStatus: AccountStatus.ACTIVE },
        select: { id: true },
      })
    ).id;
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: PASSWORD })
      .expect(200);
    token = (login.body as { accessToken: string }).accessToken;
  });

  afterEach(async () => {
    notifications.failing = false;
    await removeSessions();
  });

  afterAll(async () => {
    await removeSessions();
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.question.deleteMany({ where: { topicId } });
    await prisma.topic.deleteMany({ where: { id: topicId } });
    await prisma.subject.deleteMany({ where: { id: subjectId } });
    await app.close();
    if (previousSecret === undefined) {
      delete process.env.CRON_SECRET;
    } else {
      process.env.CRON_SECRET = previousSecret;
    }
  });

  it('is closed to anyone without the scheduler secret', async () => {
    await request(app.getHttpServer()).post(SWEEP_URL).expect(401);
    await request(app.getHttpServer())
      .post(SWEEP_URL)
      .set('Authorization', `Bearer ${CRON_SECRET}-guess`)
      .expect(401);
    // A signed-in user's token is not the scheduler's secret either.
    await request(app.getHttpServer())
      .post(SWEEP_URL)
      .set('Authorization', `Bearer ${token}`)
      .expect(401);
  });

  it('reports what it did', async () => {
    const response = await sweep().expect(200);

    const report = response.body as Record<string, unknown>;
    for (const key of [
      'sessionsCompleted',
      'sessionsAbandoned',
      'remindersSent',
      'duelsExpired',
    ]) {
      expect(typeof report[key]).toBe('number');
    }
  });

  describe('an untimed session', () => {
    it('is closed after a week untouched, without a result, freeing the slot', async () => {
      const sessionId = await createSession({ startedAt: ago(8 * DAY) });

      await sweep().expect(200);

      const row = await prisma.quizSession.findUniqueOrThrow({
        where: { id: sessionId },
        select: { status: true, completedAt: true, result: true },
      });
      expect(row.status).toBe(QuizStatus.ABANDONED);
      expect(row.completedAt).toBeNull();
      expect(row.result).toBeNull();
      expect(await prisma.xPTransaction.count({ where: { userId } })).toBe(0);

      const active = await request(app.getHttpServer())
        .get('/api/v1/quiz/active')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect((active.body as { session: unknown }).session).toBeNull();

      // The owner who comes back finds out what happened, not a 404.
      const opened = await request(app.getHttpServer())
        .get(`/api/v1/quiz/${sessionId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(
        (opened.body as { session: { status: string } }).session.status,
      ).toBe(QuizStatus.ABANDONED);
    });

    it('is left alone while answers are still being saved', async () => {
      // Started long ago, but worked on two days ago: that is homework done a
      // little at a time, not abandoned homework.
      const sessionId = await createSession({ startedAt: ago(10 * DAY) });
      await prisma.questionAttempt.create({
        data: {
          quizSessionId: sessionId,
          questionId: questionIds[0],
          selectedAnswer: [],
          isCorrect: false,
          answeredAt: ago(2 * DAY),
        },
      });

      await sweep().expect(200);

      expect(await statusOf(sessionId)).toBe(QuizStatus.ACTIVE);
    });

    it('is left alone before the week is out', async () => {
      const sessionId = await createSession({ startedAt: ago(6 * DAY) });

      await sweep().expect(200);

      expect(await statusOf(sessionId)).toBe(QuizStatus.ACTIVE);
    });
  });

  describe('a timed session whose clock ran out', () => {
    it('is scored as if its owner had opened it', async () => {
      const sessionId = await createSession({
        startedAt: ago(2 * 60 * 60 * 1000),
        expiresAt: ago(60 * 60 * 1000),
      });

      await sweep().expect(200);

      const row = await prisma.quizSession.findUniqueOrThrow({
        where: { id: sessionId },
        select: { status: true, result: true },
      });
      expect(row.status).toBe(QuizStatus.COMPLETED);
      expect(row.result?.totalQuestions).toBe(2);
      expect(row.result?.unansweredQuestions).toBe(2);
      // Counted like any completion: the XP row exists even at zero.
      expect(
        await prisma.xPTransaction.count({
          where: { quizSessionId: sessionId },
        }),
      ).toBeGreaterThan(0);
    });

    it('is not left running before its clock ends', async () => {
      const sessionId = await createSession({
        startedAt: ago(60 * 1000),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      });

      await sweep().expect(200);

      expect(await statusOf(sessionId)).toBe(QuizStatus.ACTIVE);
    });
  });

  it('changes nothing on a second run', async () => {
    // One at a time: the database allows a single active self-study session
    // per learner, so the second can exist only once the first is closed.
    const abandoned = await createSession({ startedAt: ago(8 * DAY) });
    await sweep().expect(200);
    const expired = await createSession({
      startedAt: ago(2 * 60 * 60 * 1000),
      expiresAt: ago(60 * 60 * 1000),
    });
    await sweep().expect(200);
    const xpAfterFirst = await prisma.xPTransaction.count({
      where: { userId },
    });

    await sweep().expect(200);

    expect(await statusOf(abandoned)).toBe(QuizStatus.ABANDONED);
    expect(await statusOf(expired)).toBe(QuizStatus.COMPLETED);
    expect(await prisma.xPTransaction.count({ where: { userId } })).toBe(
      xpAfterFirst,
    );
  });

  it('still closes sessions when another step fails, and says it failed', async () => {
    notifications.failing = true;
    const sessionId = await createSession({ startedAt: ago(8 * DAY) });

    // Red for the scheduler, so somebody looks at the log.
    await sweep().expect(500);

    expect(await statusOf(sessionId)).toBe(QuizStatus.ABANDONED);
  });
});
