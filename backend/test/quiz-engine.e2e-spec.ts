import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  AccountStatus,
  QuestionType,
  QuizStatus,
  UserRole,
  XPSource,
} from '@prisma/client';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

interface OptionView {
  id: string;
  content: string;
  imageUrl: string | null;
  order: number;
}

interface QuestionView {
  id: string;
  type: string;
  title: string;
  difficulty: string | null;
  imageUrl: string | null;
  answerOptions: OptionView[];
}

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

interface ResultSummary {
  correctAnswers: number;
  incorrectAnswers: number;
  unansweredQuestions: number;
  totalQuestions: number;
  accuracy: string;
  score: string;
  xpEarned: number;
  completedAt: string;
}

/**
 * Quiz engine end-to-end tests — Phase 5.1 (docs/04-api/quiz.md).
 */
describe('Quiz Engine (e2e)', () => {
  const EMAIL_PREFIX = 'phase51-quiz';
  const USERNAME_PREFIX = 'phase51quiz';
  const SLUG_PREFIX = 'p51';
  const PASSWORD = 'ValidPass1!';

  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let subjectId: string;
  let topicId: string;
  let secondTopicId: string;
  let matchingTopicId: string;
  let counter = 0;

  // Registers a fresh ACTIVE user, returns { token, userId }.
  const registerUser = async (): Promise<{ token: string; userId: string }> => {
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

  const adminReq = (
    method: 'post' | 'put' | 'patch',
    url: string,
    body: Record<string, unknown>,
  ): request.Test =>
    request(app.getHttpServer())
      [method](url)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(body);

  const createPublishedSingleChoice = async (
    parentTopic: string,
    correctIndex = 0,
  ): Promise<string> => {
    counter += 1;
    const created = await adminReq('post', '/api/v1/admin/questions', {
      topicId: parentTopic,
      type: QuestionType.SINGLE_CHOICE,
      title: `Phase51 SC ${counter}?`,
      options: [
        { content: 'A', isCorrect: correctIndex === 0 },
        { content: 'B', isCorrect: correctIndex === 1 },
        { content: 'C', isCorrect: correctIndex === 2 },
      ],
    }).expect(201);
    const id = (created.body as { id: string }).id;
    await adminReq('patch', `/api/v1/admin/questions/${id}/publish`, {
      isPublished: true,
    }).expect(200);
    return id;
  };

  const createPublishedMatching = async (
    parentTopic: string,
  ): Promise<string> => {
    counter += 1;
    const created = await adminReq('post', '/api/v1/admin/questions', {
      topicId: parentTopic,
      type: QuestionType.MATCHING,
      title: `Phase51 Match ${counter}?`,
      options: [
        { content: 'L1' },
        { content: 'R1' },
        { content: 'L2' },
        { content: 'R2' },
      ],
      configuration: {
        pairs: [
          { left: 0, right: 1 },
          { left: 2, right: 3 },
        ],
      },
    }).expect(201);
    const id = (created.body as { id: string }).id;
    await adminReq('patch', `/api/v1/admin/questions/${id}/publish`, {
      isPublished: true,
    }).expect(200);
    return id;
  };

  const start = (token: string, body: Record<string, unknown>): request.Test =>
    request(app.getHttpServer())
      .post('/api/v1/quiz/start')
      .set('Authorization', `Bearer ${token}`)
      .send(body);

  const getQuestions = async (
    token: string,
    sessionId: string,
  ): Promise<QuestionView[]> => {
    const response = await request(app.getHttpServer())
      .get(`/api/v1/quiz/${sessionId}/questions`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    return response.body as QuestionView[];
  };

  const submit = (
    token: string,
    sessionId: string,
    body: Record<string, unknown>,
  ): request.Test =>
    request(app.getHttpServer())
      .post(`/api/v1/quiz/${sessionId}/answers`)
      .set('Authorization', `Bearer ${token}`)
      .send(body);

  const complete = (token: string, sessionId: string): request.Test =>
    request(app.getHttpServer())
      .post(`/api/v1/quiz/${sessionId}/complete`)
      .set('Authorization', `Bearer ${token}`);

  // Starts a single-choice quiz and answers `correct` of its questions
  // correctly, returning the session id.
  const playSingleChoice = async (
    token: string,
    parentTopic: string,
    total: number,
    correct: number,
  ): Promise<string> => {
    const started = await start(token, {
      subjectId,
      topicId: parentTopic,
      questionCount: total,
      timerEnabled: false,
    }).expect(201);
    const sessionId = (started.body as SessionMeta).sessionId;
    const questions = await getQuestions(token, sessionId);

    for (let i = 0; i < questions.length; i += 1) {
      const q = questions[i];
      // Correct answer is option 'A' (index 0) for these fixtures; to answer
      // wrong pick a non-correct option.
      const pick = i < correct ? q.answerOptions[0] : q.answerOptions[1];
      await submit(token, sessionId, {
        questionId: q.id,
        selectedAnswer: { answerOptionId: pick.id },
      }).expect(200);
    }
    return sessionId;
  };

  const removeTestData = async (): Promise<void> => {
    // XP transactions and results restrict session deletion; clear them first.
    await prisma.xPTransaction.deleteMany({
      where: { user: { email: { startsWith: EMAIL_PREFIX } } },
    });
    await prisma.quizSession.deleteMany({
      where: { user: { email: { startsWith: EMAIL_PREFIX } } },
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

    // One admin builds the content, then acts as a normal quiz-taker too.
    const email = `${EMAIL_PREFIX}-admin@example.com`;
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, username: `${USERNAME_PREFIX}admin`, password: PASSWORD })
      .expect(201);
    await prisma.user.update({
      where: { email },
      data: { accountStatus: AccountStatus.ACTIVE, role: UserRole.ADMIN },
    });
    adminToken = (
      (
        await request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({ email, password: PASSWORD })
          .expect(200)
      ).body as { accessToken: string }
    ).accessToken;

    const subject = await adminReq('post', '/api/v1/admin/subjects', {
      name: 'Phase51 Subject',
      slug: `${SLUG_PREFIX}-subject`,
    }).expect(201);
    subjectId = (subject.body as { id: string }).id;
    await adminReq('put', `/api/v1/admin/subjects/${subjectId}`, {
      isPublished: true,
    }).expect(200);

    const makeTopic = async (label: string): Promise<string> => {
      const topic = await adminReq('post', '/api/v1/admin/topics', {
        subjectId,
        name: `Phase51 Topic ${label}`,
        slug: `${SLUG_PREFIX}-topic-${label}`,
      }).expect(201);
      const id = (topic.body as { id: string }).id;
      await adminReq('put', `/api/v1/admin/topics/${id}`, {
        isPublished: true,
      }).expect(200);
      return id;
    };

    topicId = await makeTopic('main');
    secondTopicId = await makeTopic('second');
    matchingTopicId = await makeTopic('matching');

    // 10 single-choice questions in the main topic; 4 in the second; 2 matching.
    for (let i = 0; i < 10; i += 1) {
      await createPublishedSingleChoice(topicId);
    }
    for (let i = 0; i < 4; i += 1) {
      await createPublishedSingleChoice(secondTopicId);
    }
    await createPublishedMatching(matchingTopicId);
    await createPublishedMatching(matchingTopicId);
  });

  afterAll(async () => {
    await removeTestData();
    await app.close();
  });

  describe('authentication', () => {
    it('rejects every quiz route without a token with 401', async () => {
      const ghost = '00000000-0000-0000-0000-000000000000';
      await request(app.getHttpServer()).post('/api/v1/quiz/start').expect(401);
      await request(app.getHttpServer())
        .get(`/api/v1/quiz/${ghost}`)
        .expect(401);
      await request(app.getHttpServer())
        .get(`/api/v1/quiz/${ghost}/questions`)
        .expect(401);
      await request(app.getHttpServer())
        .post(`/api/v1/quiz/${ghost}/answers`)
        .expect(401);
      await request(app.getHttpServer())
        .post(`/api/v1/quiz/${ghost}/complete`)
        .expect(401);
      await request(app.getHttpServer())
        .get(`/api/v1/quiz/${ghost}/result`)
        .expect(401);
    });
  });

  describe('POST /quiz/start', () => {
    it('creates an ACTIVE session with a fixed question set and derives the mode', async () => {
      const { token } = await registerUser();

      const withTopic = await start(token, {
        subjectId,
        topicId,
        questionCount: 5,
        timerEnabled: false,
      }).expect(201);
      const meta = withTopic.body as SessionMeta;
      expect(meta.mode).toBe('SUBJECT_QUIZ');
      expect(meta.status).toBe(QuizStatus.ACTIVE);
      expect(meta.questionCount).toBe(5);
      expect(meta.expiresAt).toBeNull();

      const questions = await getQuestions(token, meta.sessionId);
      expect(questions).toHaveLength(5);

      // Completing frees the user for the next assertion.
      await complete(token, meta.sessionId).expect(200);
    });

    it('derives RANDOM_QUIZ when no topic is given, and stores a timer deadline', async () => {
      const { token } = await registerUser();
      const started = await start(token, {
        subjectId,
        questionCount: 4,
        timerEnabled: true,
      }).expect(201);
      const meta = started.body as SessionMeta;

      expect(meta.mode).toBe('RANDOM_QUIZ');
      expect(meta.topicId).toBeNull();
      expect(meta.expiresAt).not.toBeNull();
      // 60s x 4 = 240s after start.
      const delta =
        new Date(meta.expiresAt as string).getTime() -
        new Date(meta.startedAt).getTime();
      expect(delta).toBeGreaterThanOrEqual(235_000);
      expect(delta).toBeLessThanOrEqual(245_000);
    });

    it('enforces one active session per user (409)', async () => {
      const { token } = await registerUser();
      await start(token, {
        subjectId,
        topicId,
        questionCount: 3,
        timerEnabled: false,
      }).expect(201);

      await start(token, {
        subjectId,
        topicId,
        questionCount: 3,
        timerEnabled: false,
      }).expect(409);
    });

    it('returns 409 when not enough published questions exist', async () => {
      const { token } = await registerUser();
      // Second topic has only 4 questions.
      await start(token, {
        subjectId,
        topicId: secondTopicId,
        questionCount: 20,
        timerEnabled: false,
      }).expect(409);
    });

    it.each([
      ['missing subjectId', { questionCount: 3, timerEnabled: false }],
      [
        'non-uuid subjectId',
        { subjectId: 'x', questionCount: 3, timerEnabled: false },
      ],
      [
        'questionCount 0',
        { subjectId: 'SUBJECT', questionCount: 0, timerEnabled: false },
      ],
      [
        'questionCount 51',
        { subjectId: 'SUBJECT', questionCount: 51, timerEnabled: false },
      ],
      ['missing timerEnabled', { subjectId: 'SUBJECT', questionCount: 3 }],
      [
        'unknown field',
        { subjectId: 'SUBJECT', questionCount: 3, timerEnabled: false, foo: 1 },
      ],
    ])('rejects %s with 400', async (_name, body) => {
      const { token } = await registerUser();
      const resolved =
        body.subjectId === 'SUBJECT' ? { ...body, subjectId } : body;
      await start(token, resolved).expect(400);
    });
  });

  describe('answer delivery never leaks the key', () => {
    it('omits isCorrect and configuration from questions and resume', async () => {
      const { token } = await registerUser();
      const started = await start(token, {
        subjectId,
        topicId: matchingTopicId,
        questionCount: 2,
        timerEnabled: false,
      }).expect(201);
      const sessionId = (started.body as SessionMeta).sessionId;

      const questions = await getQuestions(token, sessionId);
      const rawQuestions = JSON.stringify(questions);
      expect(rawQuestions).not.toContain('isCorrect');
      expect(rawQuestions).not.toContain('configuration');
      expect(rawQuestions).not.toContain('pairs');
      for (const q of questions) {
        for (const option of q.answerOptions) {
          expect(Object.keys(option).sort()).toEqual([
            'content',
            'id',
            'imageUrl',
            'order',
          ]);
        }
      }

      const resume = await request(app.getHttpServer())
        .get(`/api/v1/quiz/${sessionId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      const raw = JSON.stringify(resume.body);
      expect(raw).not.toContain('isCorrect');
      expect(raw).not.toContain('configuration');
    });
  });

  describe('POST /quiz/{id}/answers', () => {
    it('saves an answer, echoes it without correctness, and supports change (last write wins)', async () => {
      const { token } = await registerUser();
      const started = await start(token, {
        subjectId,
        topicId,
        questionCount: 3,
        timerEnabled: false,
      }).expect(201);
      const sessionId = (started.body as SessionMeta).sessionId;
      const [q] = await getQuestions(token, sessionId);

      const first = await submit(token, sessionId, {
        questionId: q.id,
        selectedAnswer: { answerOptionId: q.answerOptions[1].id },
        timeSpentSeconds: 12,
      }).expect(200);
      expect(first.body).toEqual({
        questionId: q.id,
        selectedAnswer: { answerOptionId: q.answerOptions[1].id },
      });
      expect(JSON.stringify(first.body)).not.toContain('isCorrect');

      // Change the answer; the row is upserted.
      await submit(token, sessionId, {
        questionId: q.id,
        selectedAnswer: { answerOptionId: q.answerOptions[0].id },
      }).expect(200);
      const attempts = await prisma.questionAttempt.count({
        where: { quizSessionId: sessionId, questionId: q.id },
      });
      expect(attempts).toBe(1);
    });

    it('rejects a foreign session with 404, and an option not on the question with 400', async () => {
      const owner = await registerUser();
      const intruder = await registerUser();
      const started = await start(owner.token, {
        subjectId,
        topicId,
        questionCount: 3,
        timerEnabled: false,
      }).expect(201);
      const sessionId = (started.body as SessionMeta).sessionId;
      const [q] = await getQuestions(owner.token, sessionId);

      await submit(intruder.token, sessionId, {
        questionId: q.id,
        selectedAnswer: { answerOptionId: q.answerOptions[0].id },
      }).expect(404);

      await submit(owner.token, sessionId, {
        questionId: q.id,
        selectedAnswer: {
          answerOptionId: '00000000-0000-0000-0000-000000000000',
        },
      }).expect(400);
    });

    it('rejects a question not in the session with 404', async () => {
      const { token } = await registerUser();
      const started = await start(token, {
        subjectId,
        topicId,
        questionCount: 2,
        timerEnabled: false,
      }).expect(201);
      const sessionId = (started.body as SessionMeta).sessionId;

      // A published question in another topic, not part of this session.
      const foreignQuestion = await prisma.question.findFirstOrThrow({
        where: { topicId: secondTopicId },
        select: { id: true, answerOptions: { select: { id: true } } },
      });
      await submit(token, sessionId, {
        questionId: foreignQuestion.id,
        selectedAnswer: { answerOptionId: foreignQuestion.answerOptions[0].id },
      }).expect(404);
    });
  });

  describe('completion, scoring, and XP', () => {
    it('scores single choice, awards XP, and is idempotent', async () => {
      const { token, userId } = await registerUser();
      // 8/10 correct = 80% → 80 XP, no bonus.
      const sessionId = await playSingleChoice(token, topicId, 10, 8);

      const done = await complete(token, sessionId).expect(200);
      const summary = done.body as ResultSummary;
      expect(summary).toMatchObject({
        correctAnswers: 8,
        incorrectAnswers: 2,
        unansweredQuestions: 0,
        totalQuestions: 10,
        accuracy: '80.00',
        score: '80.00',
        xpEarned: 80,
      });

      // A second completion is a 409 and does not double XP.
      await complete(token, sessionId).expect(409);

      const xp = await prisma.xPTransaction.findMany({
        where: { quizSessionId: sessionId },
      });
      expect(xp).toHaveLength(1);
      expect(xp[0]).toMatchObject({
        amount: 80,
        reason: XPSource.QUIZ_COMPLETION,
      });

      const stats = await prisma.statistics.findUniqueOrThrow({
        where: { userId },
      });
      expect(stats.totalQuizzes).toBe(1);
      expect(stats.totalQuestions).toBe(10);
      expect(stats.correctAnswers).toBe(8);
      expect(stats.incorrectAnswers).toBe(2);
      expect(stats.totalXP).toBe(80);
      expect(stats.averageAccuracy.toString()).toBe('80');
    });

    it('awards the high-accuracy bonus at exactly 90%', async () => {
      const { token } = await registerUser();
      // 9/10 = 90% → 90 XP + 25 bonus = 115.
      const sessionId = await playSingleChoice(token, topicId, 10, 9);
      const done = await complete(token, sessionId).expect(200);
      const summary = done.body as ResultSummary;

      expect(summary.accuracy).toBe('90.00');
      expect(summary.xpEarned).toBe(115);

      const xp = await prisma.xPTransaction.findMany({
        where: { quizSessionId: sessionId },
        orderBy: { amount: 'asc' },
      });
      expect(xp.map((t) => [t.reason, t.amount])).toEqual([
        [XPSource.HIGH_ACCURACY_BONUS, 25],
        [XPSource.QUIZ_COMPLETION, 90],
      ]);
    });

    it('counts unanswered questions as incorrect and still records a QUIZ_COMPLETION row', async () => {
      const { token } = await registerUser();
      const started = await start(token, {
        subjectId,
        topicId,
        questionCount: 4,
        timerEnabled: false,
      }).expect(201);
      const sessionId = (started.body as SessionMeta).sessionId;
      const questions = await getQuestions(token, sessionId);
      // Answer only the first, correctly. 1/4 = 25%.
      await submit(token, sessionId, {
        questionId: questions[0].id,
        selectedAnswer: { answerOptionId: questions[0].answerOptions[0].id },
      }).expect(200);

      const done = await complete(token, sessionId).expect(200);
      const summary = done.body as ResultSummary;
      expect(summary).toMatchObject({
        correctAnswers: 1,
        incorrectAnswers: 0,
        unansweredQuestions: 3,
        totalQuestions: 4,
        accuracy: '25.00',
        xpEarned: 25,
      });

      const xp = await prisma.xPTransaction.findMany({
        where: { quizSessionId: sessionId },
      });
      expect(xp).toHaveLength(1);
      expect(xp[0].amount).toBe(25);
    });

    it('evaluates MATCHING all-or-nothing', async () => {
      const { token } = await registerUser();
      const started = await start(token, {
        subjectId,
        topicId: matchingTopicId,
        questionCount: 2,
        timerEnabled: false,
      }).expect(201);
      const sessionId = (started.body as SessionMeta).sessionId;
      const questions = await getQuestions(token, sessionId);

      // Look up the correct order→id mapping from the DB for each question.
      const answerFor = async (
        qId: string,
        correct: boolean,
      ): Promise<Record<string, unknown>> => {
        const options = await prisma.answerOption.findMany({
          where: { questionId: qId },
          select: { id: true, order: true },
          orderBy: { order: 'asc' },
        });
        const byOrder = new Map(options.map((o) => [o.order, o.id]));
        if (correct) {
          return {
            pairs: [
              { left: byOrder.get(0), right: byOrder.get(1) },
              { left: byOrder.get(2), right: byOrder.get(3) },
            ],
          };
        }
        // Swap the right sides → wrong.
        return {
          pairs: [
            { left: byOrder.get(0), right: byOrder.get(3) },
            { left: byOrder.get(2), right: byOrder.get(1) },
          ],
        };
      };

      await submit(token, sessionId, {
        questionId: questions[0].id,
        selectedAnswer: await answerFor(questions[0].id, true),
      }).expect(200);
      await submit(token, sessionId, {
        questionId: questions[1].id,
        selectedAnswer: await answerFor(questions[1].id, false),
      }).expect(200);

      const done = await complete(token, sessionId).expect(200);
      expect((done.body as ResultSummary).correctAnswers).toBe(1);
    });
  });

  describe('GET /quiz/{id}/result', () => {
    it('returns the full review only after completion', async () => {
      const { token } = await registerUser();
      const sessionId = await playSingleChoice(token, topicId, 3, 2);

      // Before completion → 409.
      await request(app.getHttpServer())
        .get(`/api/v1/quiz/${sessionId}/result`)
        .set('Authorization', `Bearer ${token}`)
        .expect(409);

      await complete(token, sessionId).expect(200);

      const review = await request(app.getHttpServer())
        .get(`/api/v1/quiz/${sessionId}/result`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      const body = review.body as {
        result: ResultSummary;
        questions: {
          id: string;
          submittedAnswer: unknown;
          correctAnswer: { optionId: string };
          isCorrect: boolean;
          explanation: null;
        }[];
      };

      expect(body.result.totalQuestions).toBe(3);
      expect(body.questions).toHaveLength(3);
      for (const q of body.questions) {
        expect(q.correctAnswer).toHaveProperty('optionId');
        expect(q).toHaveProperty('isCorrect');
        expect(q.explanation).toBeNull();
      }
      // Exactly two correct as played.
      expect(body.questions.filter((q) => q.isCorrect)).toHaveLength(2);
    });

    it('returns 404 for a foreign session', async () => {
      const owner = await registerUser();
      const intruder = await registerUser();
      const sessionId = await playSingleChoice(owner.token, topicId, 2, 2);
      await complete(owner.token, sessionId).expect(200);

      await request(app.getHttpServer())
        .get(`/api/v1/quiz/${sessionId}/result`)
        .set('Authorization', `Bearer ${intruder.token}`)
        .expect(404);
    });
  });

  describe('timer expiry', () => {
    it('auto-completes an expired session on access', async () => {
      const { token } = await registerUser();
      const started = await start(token, {
        subjectId,
        topicId,
        questionCount: 2,
        timerEnabled: true,
      }).expect(201);
      const sessionId = (started.body as SessionMeta).sessionId;

      // Force the deadline into the past.
      await prisma.quizSession.update({
        where: { id: sessionId },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });

      // Any access lazily completes it; a submit then fails as not-active.
      const questions = await getQuestions(token, sessionId);
      await submit(token, sessionId, {
        questionId: questions[0].id,
        selectedAnswer: { answerOptionId: questions[0].answerOptions[0].id },
      }).expect(409);

      const session = await prisma.quizSession.findUniqueOrThrow({
        where: { id: sessionId },
      });
      expect(session.status).toBe(QuizStatus.COMPLETED);
      const result = await prisma.result.findUnique({
        where: { quizSessionId: sessionId },
      });
      expect(result).not.toBeNull();
    });
  });
});
