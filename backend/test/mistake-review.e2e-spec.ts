import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AccountStatus, QuestionType, UserRole } from '@prisma/client';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { REVIEW_LADDER_DAYS } from './../src/quiz/repositories/mistake-review.repository';

interface SessionBody {
  sessionId: string;
  questionCount: number;
}

interface QuestionBody {
  id: string;
  answerOptions: { id: string; content: string }[];
}

interface SummaryBody {
  due: number;
  scheduled: number;
  cleared: number;
}

const DAY_MS = 86_400_000;

/**
 * Spaced repetition over the learner's own mistakes.
 *
 * The application already records every wrong answer, so the only new thing is
 * *when* to bring one back. What is worth testing is therefore the ladder: a
 * wrong answer starts it, a correct answer climbs it, a wrong answer at any
 * rung drops back to the bottom, and reaching the top clears the question.
 */
describe('Mistake review (e2e)', () => {
  const PREFIX = 'review-ladder-e2e';
  const PASSWORD = 'ValidPass1!';
  const START_URL = '/api/v1/quiz/mistake-review/start';
  const SUMMARY_URL = '/api/v1/quiz/mistake-review';

  let app: INestApplication;
  let prisma: PrismaService;
  let subjectId: string;
  let topicId: string;
  let questionIds: string[] = [];
  let counter = 0;

  const register = async (): Promise<{ token: string; userId: string }> => {
    counter += 1;
    const email = `${PREFIX}-${counter}@example.com`;
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email,
        username: `${PREFIX.replace(/-/g, '')}${counter}`,
        password: PASSWORD,
      })
      .expect(201);
    const user = await prisma.user.update({
      where: { email },
      data: { accountStatus: AccountStatus.ACTIVE, role: UserRole.USER },
      select: { id: true },
    });
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: PASSWORD })
      .expect(200);
    return {
      token: (response.body as { accessToken: string }).accessToken,
      userId: user.id,
    };
  };

  /**
   * Plays an ordinary practice session over the whole topic, answering the
   * first `correctCount` questions right and the rest wrong.
   */
  const practise = async (
    token: string,
    correctCount: number,
    questionCount = questionIds.length,
  ): Promise<void> => {
    const started = await request(app.getHttpServer())
      .post('/api/v1/quiz/start')
      .set('Authorization', `Bearer ${token}`)
      .send({ subjectId, topicId, questionCount, timerEnabled: false })
      .expect(201);
    const sessionId = (started.body as SessionBody).sessionId;

    const listed = await request(app.getHttpServer())
      .get(`/api/v1/quiz/${sessionId}/questions`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    for (const [index, question] of (listed.body as QuestionBody[]).entries()) {
      const wanted = index < correctCount ? 'Правильна' : 'Хибна';
      const option = question.answerOptions.find(
        (one) => one.content === wanted,
      );
      await request(app.getHttpServer())
        .post(`/api/v1/quiz/${sessionId}/answers`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          questionId: question.id,
          selectedAnswer: { answerOptionId: option?.id },
        })
        .expect(200);
    }

    await request(app.getHttpServer())
      .post(`/api/v1/quiz/${sessionId}/complete`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  };

  /** Answers every question of a review session correctly and finishes it. */
  const passReview = async (
    token: string,
    sessionId: string,
  ): Promise<void> => {
    const listed = await request(app.getHttpServer())
      .get(`/api/v1/quiz/${sessionId}/questions`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    for (const question of listed.body as QuestionBody[]) {
      const option = question.answerOptions.find(
        (one) => one.content === 'Правильна',
      );
      await request(app.getHttpServer())
        .post(`/api/v1/quiz/${sessionId}/answers`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          questionId: question.id,
          selectedAnswer: { answerOptionId: option?.id },
        })
        .expect(200);
    }
    await request(app.getHttpServer())
      .post(`/api/v1/quiz/${sessionId}/complete`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  };

  /** Pretends a day passed, so the schedule can be exercised in one run. */
  const makeEverythingDue = async (userId: string): Promise<void> => {
    await prisma.mistakeReview.updateMany({
      where: { userId, clearedAt: null },
      data: { dueAt: new Date(Date.now() - 1000) },
    });
  };

  const removeFixtures = async (): Promise<void> => {
    const users = await prisma.user.findMany({
      where: { email: { startsWith: PREFIX } },
      select: { id: true },
    });
    const userIds = users.map((user) => user.id);
    if (userIds.length > 0) {
      const sessions = await prisma.quizSession.findMany({
        where: { userId: { in: userIds } },
        select: { id: true },
      });
      const sessionIds = sessions.map((session) => session.id);
      await prisma.xPTransaction.deleteMany({
        where: { userId: { in: userIds } },
      });
      await prisma.questionAttempt.deleteMany({
        where: { quizSessionId: { in: sessionIds } },
      });
      await prisma.result.deleteMany({
        where: { quizSessionId: { in: sessionIds } },
      });
      await prisma.quizSession.deleteMany({
        where: { userId: { in: userIds } },
      });
    }
    await prisma.user.deleteMany({ where: { email: { startsWith: PREFIX } } });
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
    await app.init();
    prisma = app.get(PrismaService);

    const subject = await prisma.subject.upsert({
      where: { slug: PREFIX },
      update: { isPublished: true, deletedAt: null },
      create: {
        name: 'Ladder fixture',
        slug: PREFIX,
        displayOrder: 9930,
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

    await removeFixtures();
    await prisma.question.deleteMany({ where: { topicId } });

    questionIds = [];
    for (let index = 0; index < 4; index += 1) {
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
  });

  afterEach(async () => {
    const active = await prisma.quizSession.findMany({
      where: { user: { email: { startsWith: PREFIX } }, status: 'ACTIVE' },
      select: { id: true },
    });
    const ids = active.map((session) => session.id);
    if (ids.length > 0) {
      await prisma.questionAttempt.deleteMany({
        where: { quizSessionId: { in: ids } },
      });
      await prisma.quizSession.deleteMany({ where: { id: { in: ids } } });
    }
  });

  afterAll(async () => {
    await removeFixtures();
    await prisma.question.deleteMany({ where: { topicId } });
    await prisma.topic.deleteMany({ where: { id: topicId } });
    await prisma.subject.deleteMany({ where: { id: subjectId } });
    await app.close();
  });

  describe('the ladder', () => {
    it('schedules a wrong answer for tomorrow', async () => {
      const learner = await register();

      await practise(learner.token, 0);

      const rows = await prisma.mistakeReview.findMany({
        where: { userId: learner.userId },
        select: { stage: true, dueAt: true, clearedAt: true },
      });

      expect(rows).toHaveLength(questionIds.length);
      expect(rows.every((row) => row.stage === 1)).toBe(true);
      expect(rows.every((row) => row.clearedAt === null)).toBe(true);
      const dueInDays = Math.round(
        (rows[0].dueAt.getTime() - Date.now()) / DAY_MS,
      );
      expect(dueInDays).toBe(REVIEW_LADDER_DAYS[0]);
    });

    it('does not schedule anything for a question answered correctly', async () => {
      const learner = await register();

      await practise(learner.token, questionIds.length);

      expect(
        await prisma.mistakeReview.count({ where: { userId: learner.userId } }),
      ).toBe(0);
    });

    it('climbs a rung on a correct answer', async () => {
      const learner = await register();
      await practise(learner.token, 0);
      await makeEverythingDue(learner.userId);

      const started = await request(app.getHttpServer())
        .post(START_URL)
        .set('Authorization', `Bearer ${learner.token}`)
        .send({})
        .expect(201);
      await passReview(learner.token, (started.body as SessionBody).sessionId);

      const row = await prisma.mistakeReview.findFirstOrThrow({
        where: { userId: learner.userId },
        select: { stage: true, dueAt: true, clearedAt: true },
      });
      expect(row.stage).toBe(2);
      expect(row.clearedAt).toBeNull();
      expect(Math.round((row.dueAt.getTime() - Date.now()) / DAY_MS)).toBe(
        REVIEW_LADDER_DAYS[1],
      );
    });

    it('clears a question once it survives the top rung', async () => {
      const learner = await register();
      await practise(learner.token, 0);

      // Three correct reviews take a question from the first rung off the end.
      for (let rung = 0; rung < REVIEW_LADDER_DAYS.length; rung += 1) {
        await makeEverythingDue(learner.userId);
        const started = await request(app.getHttpServer())
          .post(START_URL)
          .set('Authorization', `Bearer ${learner.token}`)
          .send({})
          .expect(201);
        await passReview(
          learner.token,
          (started.body as SessionBody).sessionId,
        );
      }

      const cleared = await prisma.mistakeReview.count({
        where: { userId: learner.userId, NOT: { clearedAt: null } },
      });
      expect(cleared).toBe(questionIds.length);
    });

    it('drops back to the bottom on a wrong answer part-way up', async () => {
      const learner = await register();
      await practise(learner.token, 0);
      await makeEverythingDue(learner.userId);

      const started = await request(app.getHttpServer())
        .post(START_URL)
        .set('Authorization', `Bearer ${learner.token}`)
        .send({})
        .expect(201);
      await passReview(learner.token, (started.body as SessionBody).sessionId);
      expect(
        (
          await prisma.mistakeReview.findFirstOrThrow({
            where: { userId: learner.userId },
            select: { stage: true },
          })
        ).stage,
      ).toBe(2);

      // Now get everything wrong again in ordinary practice.
      await practise(learner.token, 0);

      const rows = await prisma.mistakeReview.findMany({
        where: { userId: learner.userId },
        select: { stage: true },
      });
      expect(rows.every((row) => row.stage === 1)).toBe(true);
    });

    it('revives a cleared question when it is missed again', async () => {
      const learner = await register();
      await practise(learner.token, 0);
      for (let rung = 0; rung < REVIEW_LADDER_DAYS.length; rung += 1) {
        await makeEverythingDue(learner.userId);
        const started = await request(app.getHttpServer())
          .post(START_URL)
          .set('Authorization', `Bearer ${learner.token}`)
          .send({})
          .expect(201);
        await passReview(
          learner.token,
          (started.body as SessionBody).sessionId,
        );
      }

      await practise(learner.token, 0);

      const rows = await prisma.mistakeReview.findMany({
        where: { userId: learner.userId },
        select: { stage: true, clearedAt: true, timesWrong: true },
      });
      expect(rows.every((row) => row.clearedAt === null)).toBe(true);
      expect(rows.every((row) => row.stage === 1)).toBe(true);
      expect(rows.every((row) => row.timesWrong === 2)).toBe(true);
    });

    it('counts a correct answer from ordinary practice, not just from a review', async () => {
      const learner = await register();
      await practise(learner.token, 0);

      // No review session at all — just getting them right in practice.
      await practise(learner.token, questionIds.length);

      const rows = await prisma.mistakeReview.findMany({
        where: { userId: learner.userId },
        select: { stage: true },
      });
      expect(rows.every((row) => row.stage === 2)).toBe(true);
    });
  });

  describe('starting a review', () => {
    it('serves only what is due', async () => {
      const learner = await register();
      await practise(learner.token, 0);

      // Nothing is due yet — everything was scheduled for tomorrow.
      await request(app.getHttpServer())
        .post(START_URL)
        .set('Authorization', `Bearer ${learner.token}`)
        .send({})
        .expect(409);

      await makeEverythingDue(learner.userId);
      const started = await request(app.getHttpServer())
        .post(START_URL)
        .set('Authorization', `Bearer ${learner.token}`)
        .send({})
        .expect(201);

      expect((started.body as SessionBody).questionCount).toBe(
        questionIds.length,
      );
    });

    it('takes the self-study slot', async () => {
      const learner = await register();
      await practise(learner.token, 0);
      await makeEverythingDue(learner.userId);

      await request(app.getHttpServer())
        .post(START_URL)
        .set('Authorization', `Bearer ${learner.token}`)
        .send({})
        .expect(201);
      await request(app.getHttpServer())
        .post(START_URL)
        .set('Authorization', `Bearer ${learner.token}`)
        .send({})
        .expect(409);
    });

    it('requires a token', async () => {
      await request(app.getHttpServer()).post(START_URL).send({}).expect(401);
    });
  });

  describe('the summary', () => {
    it('separates due, scheduled and fixed', async () => {
      const learner = await register();
      await practise(learner.token, 0);

      const scheduled = await request(app.getHttpServer())
        .get(SUMMARY_URL)
        .set('Authorization', `Bearer ${learner.token}`)
        .expect(200);
      const before = scheduled.body as SummaryBody;
      expect(before.scheduled).toBe(questionIds.length);
      expect(before.due).toBe(0);
      expect(before.cleared).toBe(0);

      await makeEverythingDue(learner.userId);
      const due = await request(app.getHttpServer())
        .get(SUMMARY_URL)
        .set('Authorization', `Bearer ${learner.token}`)
        .expect(200);
      expect((due.body as SummaryBody).due).toBe(questionIds.length);
    });

    it('shows one learner nothing of another', async () => {
      const first = await register();
      const second = await register();
      await practise(first.token, 0);

      const response = await request(app.getHttpServer())
        .get(SUMMARY_URL)
        .set('Authorization', `Bearer ${second.token}`)
        .expect(200);

      expect(response.body as SummaryBody).toEqual({
        due: 0,
        scheduled: 0,
        cleared: 0,
      });
    });
  });
});
