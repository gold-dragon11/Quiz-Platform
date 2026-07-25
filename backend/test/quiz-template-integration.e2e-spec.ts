import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  AccountStatus,
  QuestionType,
  QuizType,
  UserRole,
} from '@prisma/client';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

interface SessionMeta {
  sessionId: string;
  mode: string;
  subjectId: string;
  topicId: string | null;
  questionCount: number;
  timerEnabled: boolean;
  status: string;
  startedAt: string;
  expiresAt: string | null;
}

/**
 * Quiz Template Integration — Phase 5.6: the stored-Quiz (`quizId`) path in
 * POST /api/v1/quiz/start (docs/04-api/quiz.md §4).
 */
describe('Quiz Template Integration (e2e)', () => {
  const EMAIL_PREFIX = 'phase56-qt';
  const USERNAME_PREFIX = 'phase56qt';
  const SLUG_PREFIX = 'p56';
  const PASSWORD = 'ValidPass1!';

  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let subjectId: string;
  let topicId: string;
  let counter = 0;

  const registerUser = async (
    role: UserRole = UserRole.USER,
  ): Promise<{ token: string; userId: string }> => {
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
    const user = await prisma.user.update({
      where: { email },
      data: { accountStatus: AccountStatus.ACTIVE, role },
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

  const adminReq = (
    method: 'post' | 'put' | 'patch',
    url: string,
    body: Record<string, unknown>,
  ): request.Test =>
    request(app.getHttpServer())
      [method](url)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(body);

  const createPublishedQuestion = async (
    parentTopic: string,
  ): Promise<void> => {
    counter += 1;
    const created = await adminReq('post', '/api/v1/admin/questions', {
      topicId: parentTopic,
      type: QuestionType.SINGLE_CHOICE,
      title: `Phase56 Q ${counter}?`,
      options: [{ content: 'Right', isCorrect: true }, { content: 'Wrong' }],
    }).expect(201);
    const id = (created.body as { id: string }).id;
    await adminReq('patch', `/api/v1/admin/questions/${id}/publish`, {
      isPublished: true,
    }).expect(200);
  };

  // Creates a quiz config; publishes it unless publish=false.
  const createQuiz = async (
    overrides: Record<string, unknown> = {},
    publish = true,
  ): Promise<string> => {
    counter += 1;
    const created = await adminReq('post', '/api/v1/admin/quizzes', {
      subjectId,
      topicId,
      title: `Phase56 Quiz ${counter}`,
      mode: QuizType.SUBJECT_QUIZ,
      questionCount: 5,
      timerEnabled: false,
      ...overrides,
    }).expect(201);
    const id = (created.body as { id: string }).id;
    if (publish) {
      await adminReq('put', `/api/v1/admin/quizzes/${id}`, {
        isPublished: true,
      }).expect(200);
    }
    return id;
  };

  const start = (token: string, body: Record<string, unknown>): request.Test =>
    request(app.getHttpServer())
      .post('/api/v1/quiz/start')
      .set('Authorization', `Bearer ${token}`)
      .send(body);

  const removeTestData = async (): Promise<void> => {
    await prisma.xPTransaction.deleteMany({
      where: { user: { email: { startsWith: EMAIL_PREFIX } } },
    });
    await prisma.quizSession.deleteMany({
      where: { user: { email: { startsWith: EMAIL_PREFIX } } },
    });
    await prisma.quiz.deleteMany({
      where: { subject: { slug: { startsWith: SLUG_PREFIX } } },
    });
    await prisma.question.deleteMany({
      where: { topic: { slug: { startsWith: SLUG_PREFIX } } },
    });
    await prisma.topic.deleteMany({
      where: { slug: { startsWith: SLUG_PREFIX } },
    });
    await prisma.subject.deleteMany({
      where: { slug: { startsWith: SLUG_PREFIX } },
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
    await removeTestData();

    adminToken = (await registerUser(UserRole.ADMIN)).token;

    const subject = await adminReq('post', '/api/v1/admin/subjects', {
      name: 'Phase56 Subject',
      slug: `${SLUG_PREFIX}-subject`,
    }).expect(201);
    subjectId = (subject.body as { id: string }).id;
    await adminReq('put', `/api/v1/admin/subjects/${subjectId}`, {
      isPublished: true,
    }).expect(200);
    const topic = await adminReq('post', '/api/v1/admin/topics', {
      subjectId,
      name: 'Phase56 Topic',
      slug: `${SLUG_PREFIX}-topic`,
    }).expect(201);
    topicId = (topic.body as { id: string }).id;
    await adminReq('put', `/api/v1/admin/topics/${topicId}`, {
      isPublished: true,
    }).expect(200);
    for (let i = 0; i < 8; i += 1) {
      await createPublishedQuestion(topicId);
    }
  });

  afterAll(async () => {
    await removeTestData();
    await app.close();
  });

  describe('stored-Quiz start', () => {
    it('starts a session from a published quiz using its config and stored mode', async () => {
      // RANDOM_QUIZ mode stored even though a topic is set (5.4 Q7 verbatim).
      const quizId = await createQuiz({
        mode: QuizType.RANDOM_QUIZ,
        questionCount: 6,
        timerEnabled: true,
      });
      const { token } = await registerUser();

      const res = await start(token, { quizId }).expect(201);
      const meta = res.body as SessionMeta;
      expect(meta.mode).toBe(QuizType.RANDOM_QUIZ); // copied verbatim
      expect(meta.subjectId).toBe(subjectId);
      expect(meta.topicId).toBe(topicId);
      expect(meta.questionCount).toBe(6);
      expect(meta.timerEnabled).toBe(true);
      expect(meta.expiresAt).not.toBeNull();
      expect(meta.status).toBe('ACTIVE');

      // The session links the quiz.
      const session = await prisma.quizSession.findUniqueOrThrow({
        where: { id: meta.sessionId },
        select: { quizId: true },
      });
      expect(session.quizId).toBe(quizId);

      // The delivered question set matches the quiz's questionCount.
      const questions = await request(app.getHttpServer())
        .get(`/api/v1/quiz/${meta.sessionId}/questions`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect((questions.body as unknown[]).length).toBe(6);
    });

    it('plays a stored-Quiz session through to completion (engine unchanged)', async () => {
      const quizId = await createQuiz({
        questionCount: 4,
        timerEnabled: false,
      });
      const { token } = await registerUser();
      const started = await start(token, { quizId }).expect(201);
      const sessionId = (started.body as SessionMeta).sessionId;

      const questions = (
        await request(app.getHttpServer())
          .get(`/api/v1/quiz/${sessionId}/questions`)
          .set('Authorization', `Bearer ${token}`)
          .expect(200)
      ).body as {
        id: string;
        answerOptions: { id: string; content: string }[];
      }[];
      for (const q of questions) {
        const right = q.answerOptions.find((o) => o.content === 'Right')!;
        await request(app.getHttpServer())
          .post(`/api/v1/quiz/${sessionId}/answers`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            questionId: q.id,
            selectedAnswer: { answerOptionId: right.id },
          })
          .expect(200);
      }
      const done = await request(app.getHttpServer())
        .post(`/api/v1/quiz/${sessionId}/complete`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      // 100% of 4 → 100 XP + 25 bonus = 125.
      expect(
        (done.body as { accuracy: string; xpEarned: number }).accuracy,
      ).toBe('100.00');
      expect((done.body as { xpEarned: number }).xpEarned).toBe(125);
    });

    it.each([
      [
        'an unknown quiz',
        (): Promise<string> =>
          Promise.resolve('00000000-0000-0000-0000-000000000000'),
      ],
      ['an unpublished quiz', async () => createQuiz({}, false)],
      [
        'a soft-deleted quiz',
        async () => {
          const id = await createQuiz();
          await request(app.getHttpServer())
            .delete(`/api/v1/admin/quizzes/${id}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(204);
          return id;
        },
      ],
    ])('returns 404 for %s', async (_name, makeQuizId) => {
      const quizId = await makeQuizId();
      const { token } = await registerUser();
      await start(token, { quizId }).expect(404);
    });

    it('returns 409 when the quiz needs more questions than exist', async () => {
      // Only 8 published questions exist in the topic; ask for 20.
      const quizId = await createQuiz({ questionCount: 20 });
      const { token } = await registerUser();
      await start(token, { quizId }).expect(409);
    });

    it('still enforces one active session per user (409)', async () => {
      const quizId = await createQuiz({ questionCount: 3 });
      const { token } = await registerUser();
      await start(token, { quizId }).expect(201);
      await start(token, { quizId }).expect(409);
    });
  });

  describe('XOR validation (decision B1)', () => {
    it.each([
      ['quizId + subjectId', (q: string) => ({ quizId: q, subjectId })],
      ['quizId + topicId', (q: string) => ({ quizId: q, topicId })],
      [
        'quizId + questionCount',
        (q: string) => ({ quizId: q, questionCount: 5 }),
      ],
      [
        'quizId + timerEnabled',
        (q: string) => ({ quizId: q, timerEnabled: false }),
      ],
    ])('rejects %s with 400', async (_name, build) => {
      const quizId = await createQuiz({ questionCount: 3 });
      const { token } = await registerUser();
      await start(token, build(quizId)).expect(400);
    });

    it('rejects a non-uuid quizId with 400', async () => {
      const { token } = await registerUser();
      await start(token, { quizId: 'not-a-uuid' }).expect(400);
    });

    it('rejects an empty body (neither quizId nor ad-hoc fields) with 400', async () => {
      const { token } = await registerUser();
      await start(token, {}).expect(400);
    });
  });

  describe('ad-hoc path unchanged (backward compatibility)', () => {
    it('still starts an ad-hoc session and derives the mode from topic', async () => {
      const { token } = await registerUser();
      const res = await start(token, {
        subjectId,
        topicId,
        questionCount: 3,
        timerEnabled: false,
      }).expect(201);
      const meta = res.body as SessionMeta;
      expect(meta.mode).toBe(QuizType.SUBJECT_QUIZ); // derived from topic
      expect(meta.questionCount).toBe(3);

      const session = await prisma.quizSession.findUniqueOrThrow({
        where: { id: meta.sessionId },
        select: { quizId: true },
      });
      expect(session.quizId).toBeNull();
    });

    it('still 400s a missing required ad-hoc field', async () => {
      const { token } = await registerUser();
      // Missing timerEnabled.
      await start(token, { subjectId, questionCount: 3 }).expect(400);
      // Missing subjectId.
      await start(token, { questionCount: 3, timerEnabled: false }).expect(400);
    });
  });
});
