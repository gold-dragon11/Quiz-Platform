import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  AccountStatus,
  Difficulty,
  QuestionType,
  QuizType,
  UserRole,
} from '@prisma/client';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { mockExamSpecFor } from './../src/quiz/mock-exam.config';

interface SessionBody {
  sessionId: string;
  questionCount: number;
  timerEnabled: boolean;
  expiresAt: string | null;
}

interface AttemptBody {
  sessionId: string;
  subject: { id: string };
  correctAnswers: number;
  totalQuestions: number;
  accuracy: number;
  completedAt: string;
}

/**
 * Mock exam sittings (docs/00-overview/teacher-side-decisions.md decision 28).
 *
 * The point of a mock is that the conditions match the real thing, so the
 * tests here are about the conditions: a fixed paper nobody configures, one
 * clock for the whole paper rather than per question, and a history that can
 * be read as a curve.
 *
 * There is deliberately no converted exam score to test — see
 * `src/quiz/mock-exam.config.ts` for why inventing one would be worse than
 * leaving it out.
 */
describe('Mock exam (e2e)', () => {
  const PREFIX = 'mock-e2e';
  const PASSWORD = 'ValidPass1!';
  const START_URL = '/api/v1/quiz/mock-exam/start';
  const HISTORY_URL = '/api/v1/quiz/mock-exam/history';

  const spec = mockExamSpecFor('anything');

  let app: INestApplication;
  let prisma: PrismaService;
  let subjectId: string;
  let thinSubjectId: string;
  let topicId: string;
  let thinTopicId: string;
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

  const startMock = (token: string, subject = subjectId) =>
    request(app.getHttpServer())
      .post(START_URL)
      .set('Authorization', `Bearer ${token}`)
      .send({ subjectId: subject });

  const completeSession = async (
    token: string,
    sessionId: string,
  ): Promise<void> => {
    await request(app.getHttpServer())
      .post(`/api/v1/quiz/${sessionId}/complete`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  };

  const seedQuestions = async (
    topic: string,
    perTier: number,
  ): Promise<void> => {
    await prisma.question.deleteMany({ where: { topicId: topic } });
    const tiers = [
      Difficulty.BEGINNER,
      Difficulty.INTERMEDIATE,
      Difficulty.ADVANCED,
    ];
    for (const difficulty of tiers) {
      for (let index = 0; index < perTier; index += 1) {
        await prisma.question.create({
          data: {
            topicId: topic,
            type: QuestionType.SINGLE_CHOICE,
            title: `${difficulty} ${index}`,
            isPublished: true,
            difficulty,
            answerOptions: {
              create: [
                { content: 'Правильна', order: 0, isCorrect: true },
                { content: 'Хибна', order: 1, isCorrect: false },
              ],
            },
          },
        });
      }
    }
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

  const ensureSubject = async (
    slug: string,
    order: number,
  ): Promise<{ subjectId: string; topicId: string }> => {
    const subject = await prisma.subject.upsert({
      where: { slug },
      update: { isPublished: true, deletedAt: null },
      create: { name: slug, slug, displayOrder: order, isPublished: true },
      select: { id: true },
    });
    const topic = await prisma.topic.upsert({
      where: { subjectId_slug: { subjectId: subject.id, slug } },
      update: { isPublished: true, deletedAt: null },
      create: {
        subjectId: subject.id,
        name: slug,
        slug,
        displayOrder: 1,
        isPublished: true,
      },
      select: { id: true },
    });
    return { subjectId: subject.id, topicId: topic.id };
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

    const full = await ensureSubject(`${PREFIX}-full`, 9940);
    subjectId = full.subjectId;
    topicId = full.topicId;

    const thin = await ensureSubject(`${PREFIX}-thin`, 9941);
    thinSubjectId = thin.subjectId;
    thinTopicId = thin.topicId;

    await removeFixtures();
    // Comfortably more than one paper needs, in every tier.
    await seedQuestions(topicId, spec.questionCount);
    // Nowhere near enough.
    await seedQuestions(thinTopicId, 2);
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
    await prisma.question.deleteMany({
      where: { topicId: { in: [topicId, thinTopicId] } },
    });
    await prisma.topic.deleteMany({
      where: { id: { in: [topicId, thinTopicId] } },
    });
    await prisma.subject.deleteMany({
      where: { id: { in: [subjectId, thinSubjectId] } },
    });
    await app.close();
  });

  describe('the sitting', () => {
    it('hands out a full paper on one clock', async () => {
      const learner = await register();

      const response = await startMock(learner.token).expect(201);

      const body = response.body as SessionBody;
      expect(body.questionCount).toBe(spec.questionCount);
      expect(body.timerEnabled).toBe(true);
      expect(body.expiresAt).not.toBeNull();

      // One clock for the whole paper, not sixty seconds a question — the
      // ordinary quiz timer would have given a very different deadline.
      const minutesGranted = Math.round(
        (new Date(body.expiresAt as string).getTime() - Date.now()) / 60000,
      );
      expect(minutesGranted).toBe(spec.minutes);
    });

    it('records the sitting as its own type', async () => {
      const learner = await register();

      const started = await startMock(learner.token).expect(201);

      const session = await prisma.quizSession.findUniqueOrThrow({
        where: { id: (started.body as SessionBody).sessionId },
        select: { mode: true, topicId: true },
      });
      expect(session.mode).toBe(QuizType.MOCK_EXAM);
      // A mock covers the subject, so it is never pinned to one topic.
      expect(session.topicId).toBeNull();
    });

    it('draws the weighting the specification asks for', async () => {
      const learner = await register();

      const started = await startMock(learner.token).expect(201);
      const rows = await prisma.quizSessionQuestion.findMany({
        where: { quizSessionId: (started.body as SessionBody).sessionId },
        select: { question: { select: { difficulty: true } } },
      });

      const counts = new Map<string, number>();
      for (const row of rows) {
        const tier = row.question.difficulty ?? 'NONE';
        counts.set(tier, (counts.get(tier) ?? 0) + 1);
      }

      for (const entry of spec.mix) {
        const expected = Math.floor(spec.questionCount * entry.share);
        expect(counts.get(entry.difficulty) ?? 0).toBeGreaterThanOrEqual(
          expected,
        );
      }
    });

    it('refuses a subject with too few questions rather than shortening the paper', async () => {
      const learner = await register();

      await startMock(learner.token, thinSubjectId).expect(409);
    });

    it('refuses an unpublished subject', async () => {
      const learner = await register();
      const hidden = await prisma.subject.create({
        data: {
          name: 'Hidden',
          slug: `${PREFIX}-hidden`,
          displayOrder: 9942,
          isPublished: false,
        },
        select: { id: true },
      });

      await startMock(learner.token, hidden.id).expect(404);

      await prisma.subject.delete({ where: { id: hidden.id } });
    });

    it('takes the self-study slot — one sitting at a time', async () => {
      const learner = await register();
      await startMock(learner.token).expect(201);

      await startMock(learner.token).expect(409);
    });

    it('blocks ordinary practice while a sitting is open', async () => {
      const learner = await register();
      await startMock(learner.token).expect(201);

      await request(app.getHttpServer())
        .post('/api/v1/quiz/start')
        .set('Authorization', `Bearer ${learner.token}`)
        .send({ subjectId, questionCount: 2, timerEnabled: false })
        .expect(409);
    });

    it('rejects anything beyond the subject in the body', async () => {
      const learner = await register();

      await request(app.getHttpServer())
        .post(START_URL)
        .set('Authorization', `Bearer ${learner.token}`)
        .send({ subjectId, questionCount: 5 })
        .expect(400);
    });

    it('requires a token', async () => {
      await request(app.getHttpServer())
        .post(START_URL)
        .send({ subjectId })
        .expect(401);
    });
  });

  describe('history', () => {
    it('returns sittings oldest first, so the line reads left to right', async () => {
      const learner = await register();

      const first = await startMock(learner.token).expect(201);
      await completeSession(
        learner.token,
        (first.body as SessionBody).sessionId,
      );
      const second = await startMock(learner.token).expect(201);
      await completeSession(
        learner.token,
        (second.body as SessionBody).sessionId,
      );

      const response = await request(app.getHttpServer())
        .get(HISTORY_URL)
        .set('Authorization', `Bearer ${learner.token}`)
        .expect(200);

      const attempts = response.body as AttemptBody[];
      expect(attempts).toHaveLength(2);
      expect(attempts[0].sessionId).toBe((first.body as SessionBody).sessionId);
      expect(attempts[0].totalQuestions).toBe(spec.questionCount);
    });

    it('leaves ordinary practice out of it', async () => {
      const learner = await register();

      const practice = await request(app.getHttpServer())
        .post('/api/v1/quiz/start')
        .set('Authorization', `Bearer ${learner.token}`)
        .send({ subjectId, questionCount: 2, timerEnabled: false })
        .expect(201);
      await completeSession(
        learner.token,
        (practice.body as SessionBody).sessionId,
      );

      const response = await request(app.getHttpServer())
        .get(HISTORY_URL)
        .set('Authorization', `Bearer ${learner.token}`)
        .expect(200);

      expect(response.body as AttemptBody[]).toHaveLength(0);
    });

    it('shows one learner nothing of another', async () => {
      const first = await register();
      const second = await register();
      const started = await startMock(first.token).expect(201);
      await completeSession(
        first.token,
        (started.body as SessionBody).sessionId,
      );

      const response = await request(app.getHttpServer())
        .get(HISTORY_URL)
        .set('Authorization', `Bearer ${second.token}`)
        .expect(200);

      expect(response.body as AttemptBody[]).toHaveLength(0);
    });

    it('never carries a converted exam score', async () => {
      const learner = await register();
      const started = await startMock(learner.token).expect(201);
      await completeSession(
        learner.token,
        (started.body as SessionBody).sessionId,
      );

      const response = await request(app.getHttpServer())
        .get(HISTORY_URL)
        .set('Authorization', `Bearer ${learner.token}`)
        .expect(200);

      // The official conversion table is not ours to guess at; a fabricated
      // "you would have scored 168" is worse than no number at all.
      const serialized = JSON.stringify(response.body);
      expect(serialized).not.toContain('scaledScore');
      expect(serialized).not.toContain('examScore');
    });
  });
});
