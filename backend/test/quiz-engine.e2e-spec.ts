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
import { listenOnLoopback } from './loopback';

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
  /** MATCHING only: how many ordered options are prompts. */
  promptCount?: number;
  passage: { id: string; title: string | null; content: string } | null;
  passageOrder: number | null;
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
  let wideMatchingTopicId: string;
  let nmtMatchingTopicId: string;
  let difficultyTopicId: string;
  let formatTopicId: string;
  let orderingTopicId: string;
  let multipleChoiceTopicId: string;
  let numericTopicId: string;
  let passageTopicId: string;
  let passageId: string;
  let counter = 0;
  /** A well-formed uuid that belongs to no option in the bank. */
  const GHOST_OPTION_ID = '00000000-0000-0000-0000-0000000000aa';

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

  // Same as above but with an explicit level, for the difficulty filter.
  const createPublishedAtDifficulty = async (
    parentTopic: string,
    difficulty: string,
  ): Promise<string> => {
    counter += 1;
    const created = await adminReq('post', '/api/v1/admin/questions', {
      topicId: parentTopic,
      type: QuestionType.SINGLE_CHOICE,
      title: `Phase51 ${difficulty} ${counter}?`,
      difficulty,
      options: [
        { content: 'A', isCorrect: true },
        { content: 'B' },
        { content: 'C' },
      ],
    }).expect(201);
    const id = (created.body as { id: string }).id;
    await adminReq('patch', `/api/v1/admin/questions/${id}/publish`, {
      isPublished: true,
    }).expect(200);
    return id;
  };

  // Same again but with an authoring format, for the format filter.
  const createPublishedInFormat = async (
    parentTopic: string,
    format: string,
  ): Promise<string> => {
    counter += 1;
    const created = await adminReq('post', '/api/v1/admin/questions', {
      topicId: parentTopic,
      type: QuestionType.SINGLE_CHOICE,
      title: `Phase51 ${format} ${counter}?`,
      format,
      options: [
        { content: 'A', isCorrect: true },
        { content: 'B' },
        { content: 'C' },
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
      // Prompts first, then choices — the shape the client can actually draw,
      // and the shape every question in the bank is stored in.
      options: [
        { content: 'L1' },
        { content: 'L2' },
        { content: 'R1' },
        { content: 'R2' },
      ],
      configuration: {
        pairs: [
          { left: 0, right: 2 },
          { left: 1, right: 3 },
        ],
      },
    }).expect(201);
    const id = (created.body as { id: string }).id;
    await adminReq('patch', `/api/v1/admin/questions/${id}/publish`, {
      isPublished: true,
    }).expect(200);
    return id;
  };

  /**
   * A matching question shaped like the real bank: four prompts (order 0-3)
   * followed by four choices (order 4-7), keyed straight down — 0→4, 1→5,
   * 2→6, 3→7. Every one of the 630 published matching questions is stored
   * exactly this way, which is why the delivered order has to be dealt.
   */
  const createWideMatching = async (parentTopic: string): Promise<string> => {
    counter += 1;
    const created = await adminReq('post', '/api/v1/admin/questions', {
      topicId: parentTopic,
      type: QuestionType.MATCHING,
      title: `Phase51 WideMatch ${counter}?`,
      options: [
        { content: 'L1' },
        { content: 'L2' },
        { content: 'L3' },
        { content: 'L4' },
        { content: 'R1' },
        { content: 'R2' },
        { content: 'R3' },
        { content: 'R4' },
      ],
      configuration: {
        pairs: [
          { left: 0, right: 4 },
          { left: 1, right: 5 },
          { left: 2, right: 6 },
          { left: 3, right: 7 },
        ],
      },
    }).expect(201);
    const id = (created.body as { id: string }).id;
    await adminReq('patch', `/api/v1/admin/questions/${id}/publish`, {
      isPublished: true,
    }).expect(200);
    return id;
  };

  /**
   * A matching question in the NMT shape: four prompts (order 0-3) against
   * five choices (order 4-8), one of which pairs with nothing. Every matching
   * task on the real paper offers spare choices — 4×5 in Ukrainian and
   * history, 3×5 in mathematics — so the columns are never the same size.
   */
  const createNmtMatching = async (parentTopic: string): Promise<string> => {
    counter += 1;
    const created = await adminReq('post', '/api/v1/admin/questions', {
      topicId: parentTopic,
      type: QuestionType.MATCHING,
      title: `Phase51 NmtMatch ${counter}?`,
      options: [
        { content: 'P1' },
        { content: 'P2' },
        { content: 'P3' },
        { content: 'P4' },
        { content: 'C1' },
        { content: 'C2' },
        { content: 'C3' },
        { content: 'C4' },
        { content: 'SPARE' },
      ],
      configuration: {
        pairs: [
          { left: 0, right: 4 },
          { left: 1, right: 5 },
          { left: 2, right: 6 },
          { left: 3, right: 7 },
        ],
      },
    }).expect(201);
    const id = (created.body as { id: string }).id;
    await adminReq('patch', `/api/v1/admin/questions/${id}/publish`, {
      isPublished: true,
    }).expect(200);
    return id;
  };

  /**
   * An ORDERING question: four items authored in the correct sequence. The
   * stored order is the key, so the delivery view has to deal them.
   */
  const createPublishedOrdering = async (
    parentTopic: string,
  ): Promise<string> => {
    counter += 1;
    const created = await adminReq('post', '/api/v1/admin/questions', {
      topicId: parentTopic,
      type: 'ORDERING',
      title: `Phase51 Order ${counter}?`,
      options: [
        { content: `first ${counter}` },
        { content: `second ${counter}` },
        { content: `third ${counter}` },
        { content: `fourth ${counter}` },
      ],
    }).expect(201);
    const id = (created.body as { id: string }).id;
    await adminReq('patch', `/api/v1/admin/questions/${id}/publish`, {
      isPublished: true,
    }).expect(200);
    return id;
  };

  /** A MULTIPLE_CHOICE question in the exam's shape: three correct of seven. */
  const createPublishedMultipleChoice = async (
    parentTopic: string,
  ): Promise<string> => {
    counter += 1;
    const created = await adminReq('post', '/api/v1/admin/questions', {
      topicId: parentTopic,
      type: 'MULTIPLE_CHOICE',
      title: `Phase51 Multi ${counter}?`,
      options: [
        { content: `right A ${counter}`, isCorrect: true },
        { content: `wrong B ${counter}` },
        { content: `right C ${counter}`, isCorrect: true },
        { content: `wrong D ${counter}` },
        { content: `right E ${counter}`, isCorrect: true },
        { content: `wrong F ${counter}` },
        { content: `wrong G ${counter}` },
      ],
    }).expect(201);
    const id = (created.body as { id: string }).id;
    await adminReq('patch', `/api/v1/admin/questions/${id}/publish`, {
      isPublished: true,
    }).expect(200);
    return id;
  };

  /** A NUMERIC question: no options, the value hidden in the configuration. */
  const createPublishedNumeric = async (
    parentTopic: string,
    answer: number,
  ): Promise<string> => {
    counter += 1;
    const created = await adminReq('post', '/api/v1/admin/questions', {
      topicId: parentTopic,
      type: 'NUMERIC',
      title: `Phase51 Numeric ${counter}?`,
      options: [],
      configuration: { answer },
    }).expect(201);
    const id = (created.body as { id: string }).id;
    await adminReq('patch', `/api/v1/admin/questions/${id}/publish`, {
      isPublished: true,
    }).expect(200);
    return id;
  };

  /** The stored option order — the answer key the client never receives. */
  const storedOptionIds = async (questionId: string): Promise<string[]> => {
    const options = await prisma.answerOption.findMany({
      where: { questionId },
      orderBy: { order: 'asc' },
      select: { id: true },
    });
    return options.map((option) => option.id);
  };

  const correctOptionIds = async (questionId: string): Promise<string[]> => {
    const options = await prisma.answerOption.findMany({
      where: { questionId, isCorrect: true },
      select: { id: true },
    });
    return options.map((option) => option.id);
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
    await listenOnLoopback(app);

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

    wideMatchingTopicId = await makeTopic('wide-matching');
    await createWideMatching(wideMatchingTopicId);

    nmtMatchingTopicId = await makeTopic('nmt-matching');
    await createNmtMatching(nmtMatchingTopicId);

    // 6 beginner + 2 advanced: lopsided on purpose, like the real content
    // where the advanced tier is far smaller than the others.
    difficultyTopicId = await makeTopic('difficulty');
    for (let i = 0; i < 6; i += 1) {
      await createPublishedAtDifficulty(difficultyTopicId, 'BEGINNER');
    }
    for (let i = 0; i < 2; i += 1) {
      await createPublishedAtDifficulty(difficultyTopicId, 'ADVANCED');
    }

    orderingTopicId = await makeTopic('ordering');
    for (let i = 0; i < 3; i += 1) {
      await createPublishedOrdering(orderingTopicId);
    }

    multipleChoiceTopicId = await makeTopic('multiple-choice');
    for (let i = 0; i < 3; i += 1) {
      await createPublishedMultipleChoice(multipleChoiceTopicId);
    }

    numericTopicId = await makeTopic('numeric');
    await createPublishedNumeric(numericTopicId, 12.5);
    await createPublishedNumeric(numericTopicId, -4);
    await createPublishedNumeric(numericTopicId, 0);

    // A three-question passage whose questions are created out of order, and
    // two questions that stand alone: the draw has to keep the passage whole,
    // in its own order, however the pool happens to be shuffled.
    passageTopicId = await makeTopic('passage');
    passageId = (
      await prisma.passage.create({
        data: {
          topicId: passageTopicId,
          slug: `${SLUG_PREFIX}-story`,
          title: 'Phase51 Story',
          content:
            'One gap (1) ______, a second (2) ______ and a third (3) ______.',
        },
      })
    ).id;
    for (const passageOrder of [3, 1, 2]) {
      const id = await createPublishedSingleChoice(passageTopicId);
      await prisma.question.update({
        where: { id },
        data: { passageId, passageOrder },
      });
    }
    for (let i = 0; i < 2; i += 1) {
      await createPublishedSingleChoice(passageTopicId);
    }

    // 5 practice + 3 reference: the bank as it is while the NMT set is still
    // being written topic by topic.
    formatTopicId = await makeTopic('format');
    for (let i = 0; i < 5; i += 1) {
      await createPublishedInFormat(formatTopicId, 'PRACTICE');
    }
    for (let i = 0; i < 3; i += 1) {
      await createPublishedInFormat(formatTopicId, 'NMT');
    }
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

    it.each<[string, Record<string, unknown>]>([
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

  describe('GET /quiz/active', () => {
    it('rejects without a token with 401', async () => {
      await request(app.getHttpServer()).get('/api/v1/quiz/active').expect(401);
    });

    it('wraps a null session rather than sending an empty body — Nest sends no body at all for a bare null return', async () => {
      const { token } = await registerUser();

      const response = await request(app.getHttpServer())
        .get('/api/v1/quiz/active')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toEqual({ session: null });
    });

    it('finds the session that POST /quiz/start refused to duplicate — the actual point of this endpoint', async () => {
      const { token } = await registerUser();
      const started = await start(token, {
        subjectId,
        topicId,
        questionCount: 3,
        timerEnabled: false,
      }).expect(201);
      const sessionId = (started.body as SessionMeta).sessionId;

      // The scenario this endpoint exists for: the id above is the only place
      // that session id ever appeared. Nothing else in this test — and, before
      // this endpoint, nothing in the product — recovers it.
      const active = await request(app.getHttpServer())
        .get('/api/v1/quiz/active')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const session = (active.body as { session: SessionMeta }).session;
      expect(session.sessionId).toBe(sessionId);
      expect(session.status).toBe(QuizStatus.ACTIVE);
    });

    it('reverts to a null session once it is completed', async () => {
      const { token } = await registerUser();
      const sessionId = await playSingleChoice(token, topicId, 3, 3);
      await complete(token, sessionId).expect(200);

      const active = await request(app.getHttpServer())
        .get('/api/v1/quiz/active')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(active.body).toEqual({ session: null });
    });

    it("never returns another user's session", async () => {
      const owner = await registerUser();
      const bystander = await registerUser();
      await start(owner.token, {
        subjectId,
        topicId,
        questionCount: 3,
        timerEnabled: false,
      }).expect(201);

      const active = await request(app.getHttpServer())
        .get('/api/v1/quiz/active')
        .set('Authorization', `Bearer ${bystander.token}`)
        .expect(200);

      expect(active.body).toEqual({ session: null });
    });
  });

  describe('difficulty filter', () => {
    const available = async (
      token: string,
      query: Record<string, string>,
    ): Promise<number> => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/quiz/available')
        .query(query)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      return (response.body as { available: number }).available;
    };

    it('rejects the availability check without a token with 401', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/quiz/available')
        .query({ subjectId })
        .expect(401);
    });

    it('counts the whole topic when no level is given', async () => {
      const { token } = await registerUser();
      expect(
        await available(token, { subjectId, topicId: difficultyTopicId }),
      ).toBe(8);
    });

    it('counts only the requested level', async () => {
      const { token } = await registerUser();
      expect(
        await available(token, {
          subjectId,
          topicId: difficultyTopicId,
          difficulty: 'BEGINNER',
        }),
      ).toBe(6);
      expect(
        await available(token, {
          subjectId,
          topicId: difficultyTopicId,
          difficulty: 'ADVANCED',
        }),
      ).toBe(2);
      expect(
        await available(token, {
          subjectId,
          topicId: difficultyTopicId,
          difficulty: 'INTERMEDIATE',
        }),
      ).toBe(0);
    });

    it('draws only questions of the requested level', async () => {
      const { token } = await registerUser();
      const started = await start(token, {
        subjectId,
        topicId: difficultyTopicId,
        questionCount: 2,
        timerEnabled: false,
        difficulty: 'ADVANCED',
      }).expect(201);
      const sessionId = (started.body as SessionMeta).sessionId;

      const questions = await getQuestions(token, sessionId);
      expect(questions).toHaveLength(2);
      // Only two advanced questions exist in this topic, so drawing two of
      // them proves the filter excluded the six beginner ones.
      expect(questions.every((q) => q.difficulty === 'ADVANCED')).toBe(true);
    });

    it('refuses more than the level holds, and says the level is the limit', async () => {
      const { token } = await registerUser();
      const response = await start(token, {
        subjectId,
        topicId: difficultyTopicId,
        questionCount: 5,
        timerEnabled: false,
        difficulty: 'ADVANCED',
      }).expect(409);

      expect((response.body as { message: string }).message).toBe(
        'Для цього рівня бракує опублікованих питань. Оберіть меншу кількість або інший рівень.',
      );
    });

    it('the availability count predicts exactly what start accepts', async () => {
      const { token } = await registerUser();
      const count = await available(token, {
        subjectId,
        topicId: difficultyTopicId,
        difficulty: 'ADVANCED',
      });

      // Sizing the request by the count succeeds; one more does not. This is
      // the contract the endpoint exists to provide.
      await start(token, {
        subjectId,
        topicId: difficultyTopicId,
        questionCount: count,
        timerEnabled: false,
        difficulty: 'ADVANCED',
      }).expect(201);

      const active = await request(app.getHttpServer())
        .get('/api/v1/quiz/active')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      await complete(
        token,
        (active.body as { session: SessionMeta }).session.sessionId,
      ).expect(200);

      await start(token, {
        subjectId,
        topicId: difficultyTopicId,
        questionCount: count + 1,
        timerEnabled: false,
        difficulty: 'ADVANCED',
      }).expect(409);
    });

    it('rejects difficulty combined with onlyMistakes as 400', async () => {
      const { token } = await registerUser();
      await start(token, {
        subjectId,
        topicId: difficultyTopicId,
        questionCount: 2,
        timerEnabled: false,
        difficulty: 'ADVANCED',
        onlyMistakes: true,
      }).expect(400);
    });

    it('rejects difficulty combined with quizId as 400', async () => {
      const { token } = await registerUser();
      await start(token, {
        quizId: '00000000-0000-0000-0000-000000000000',
        difficulty: 'ADVANCED',
      }).expect(400);
    });

    it('rejects an unknown difficulty value with 400', async () => {
      const { token } = await registerUser();
      await start(token, {
        subjectId,
        topicId: difficultyTopicId,
        questionCount: 2,
        timerEnabled: false,
        difficulty: 'IMPOSSIBLE',
      }).expect(400);
    });
  });

  describe('format filter', () => {
    const available = async (
      token: string,
      query: Record<string, string>,
    ): Promise<number> => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/quiz/available')
        .query(query)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      return (response.body as { available: number }).available;
    };

    it('counts both formats when none is given, and each on its own', async () => {
      const { token } = await registerUser();
      expect(
        await available(token, { subjectId, topicId: formatTopicId }),
      ).toBe(8);
      expect(
        await available(token, {
          subjectId,
          topicId: formatTopicId,
          format: 'NMT',
        }),
      ).toBe(3);
      expect(
        await available(token, {
          subjectId,
          topicId: formatTopicId,
          format: 'PRACTICE',
        }),
      ).toBe(5);
    });

    it('draws only questions of the requested format', async () => {
      const { token } = await registerUser();
      const started = await start(token, {
        subjectId,
        topicId: formatTopicId,
        questionCount: 3,
        timerEnabled: false,
        format: 'NMT',
      }).expect(201);
      const sessionId = (started.body as SessionMeta).sessionId;

      // Only three NMT questions exist in this topic, so drawing three of them
      // proves the filter excluded the five practice ones. Their titles carry
      // the format, which the client never sees on the question itself.
      const questions = await getQuestions(token, sessionId);
      expect(questions).toHaveLength(3);
      expect(questions.every((q) => q.title.includes('NMT'))).toBe(true);
    });

    it('refuses more than the format holds, and says which pool ran out', async () => {
      const { token } = await registerUser();
      const response = await start(token, {
        subjectId,
        topicId: formatTopicId,
        questionCount: 5,
        timerEnabled: false,
        format: 'NMT',
      }).expect(409);

      expect((response.body as { message: string }).message).toBe(
        'Завдань формату НМТ у цій темі поки бракує. Оберіть меншу кількість або звичайне тренування.',
      );
    });

    it('rejects format combined with onlyMistakes, with quizId, and unknown values', async () => {
      const { token } = await registerUser();
      await start(token, {
        subjectId,
        topicId: formatTopicId,
        questionCount: 2,
        timerEnabled: false,
        format: 'NMT',
        onlyMistakes: true,
      }).expect(400);

      await start(token, {
        quizId: '00000000-0000-0000-0000-000000000000',
        format: 'NMT',
      }).expect(400);

      await start(token, {
        subjectId,
        topicId: formatTopicId,
        questionCount: 2,
        timerEnabled: false,
        format: 'ZNO',
      }).expect(400);
    });
  });

  describe('ORDERING questions', () => {
    it('deals the items in a different order than they are stored', async () => {
      const { token } = await registerUser();
      const started = await start(token, {
        subjectId,
        topicId: orderingTopicId,
        questionCount: 3,
        timerEnabled: false,
      }).expect(201);
      const sessionId = (started.body as SessionMeta).sessionId;
      const questions = await getQuestions(token, sessionId);

      // Across three questions at least one has to come back re-dealt. A
      // single question could legitimately be dealt back into its own order
      // (one deal in 24 for four items), so asserting on one would be flaky.
      let anyReordered = false;
      for (const question of questions) {
        const stored = await storedOptionIds(question.id);
        const delivered = [...question.answerOptions]
          .sort((a, b) => a.order - b.order)
          .map((option) => option.id);
        expect(new Set(delivered)).toEqual(new Set(stored));
        if (delivered.join() !== stored.join()) {
          anyReordered = true;
        }
      }
      expect(anyReordered).toBe(true);
    });

    it('deals the same order again on resume', async () => {
      const { token } = await registerUser();
      const started = await start(token, {
        subjectId,
        topicId: orderingTopicId,
        questionCount: 3,
        timerEnabled: false,
      }).expect(201);
      const sessionId = (started.body as SessionMeta).sessionId;

      const first = await getQuestions(token, sessionId);
      const second = await getQuestions(token, sessionId);
      expect(second.map((q) => q.answerOptions.map((o) => o.order))).toEqual(
        first.map((q) => q.answerOptions.map((o) => o.order)),
      );
    });

    it('accepts the stored sequence and rejects a wrong one', async () => {
      const { token } = await registerUser();
      const started = await start(token, {
        subjectId,
        topicId: orderingTopicId,
        questionCount: 2,
        timerEnabled: false,
      }).expect(201);
      const sessionId = (started.body as SessionMeta).sessionId;
      const questions = await getQuestions(token, sessionId);

      const right = await storedOptionIds(questions[0].id);
      await submit(token, sessionId, {
        questionId: questions[0].id,
        selectedAnswer: { sequence: right },
      }).expect(200);

      const swapped = await storedOptionIds(questions[1].id);
      [swapped[0], swapped[1]] = [swapped[1], swapped[0]];
      await submit(token, sessionId, {
        questionId: questions[1].id,
        selectedAnswer: { sequence: swapped },
      }).expect(200);

      const finished = await complete(token, sessionId).expect(200);
      expect((finished.body as { correctAnswers: number }).correctAnswers).toBe(
        1,
      );
    });

    it('stores a half-placed sequence as a wrong answer, not an error', async () => {
      const { token } = await registerUser();
      const started = await start(token, {
        subjectId,
        topicId: orderingTopicId,
        questionCount: 1,
        timerEnabled: false,
      }).expect(201);
      const sessionId = (started.body as SessionMeta).sessionId;
      const [question] = await getQuestions(token, sessionId);
      const stored = await storedOptionIds(question.id);

      // The reader places two of the four items and the page autosaves.
      await submit(token, sessionId, {
        questionId: question.id,
        selectedAnswer: { sequence: stored.slice(0, 2) },
      }).expect(200);

      const finished = await complete(token, sessionId).expect(200);
      expect((finished.body as { correctAnswers: number }).correctAnswers).toBe(
        0,
      );
    });

    it('rejects a malformed sequence with 400', async () => {
      const { token } = await registerUser();
      const started = await start(token, {
        subjectId,
        topicId: orderingTopicId,
        questionCount: 1,
        timerEnabled: false,
      }).expect(201);
      const sessionId = (started.body as SessionMeta).sessionId;
      const [question] = await getQuestions(token, sessionId);
      const stored = await storedOptionIds(question.id);

      // The same item twice.
      await submit(token, sessionId, {
        questionId: question.id,
        selectedAnswer: {
          sequence: [stored[0], stored[0], stored[1], stored[2]],
        },
      }).expect(400);

      // An option from another question.
      const other = await storedOptionIds(
        (await getQuestions(token, sessionId))[0].id,
      );
      await submit(token, sessionId, {
        questionId: question.id,
        selectedAnswer: { sequence: [...stored.slice(1), GHOST_OPTION_ID] },
      }).expect(400);
      expect(other.length).toBe(4);
    });

    it('shows the correct sequence in the review, never during the quiz', async () => {
      const { token } = await registerUser();
      const started = await start(token, {
        subjectId,
        topicId: orderingTopicId,
        questionCount: 1,
        timerEnabled: false,
      }).expect(201);
      const sessionId = (started.body as SessionMeta).sessionId;
      const [question] = await getQuestions(token, sessionId);
      expect(JSON.stringify(question)).not.toContain('isCorrect');

      const stored = await storedOptionIds(question.id);
      await submit(token, sessionId, {
        questionId: question.id,
        selectedAnswer: { sequence: stored },
      }).expect(200);
      await complete(token, sessionId).expect(200);

      const review = await request(app.getHttpServer())
        .get(`/api/v1/quiz/${sessionId}/result`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      const reviewed = (
        review.body as {
          questions: { correctAnswer: { sequence: string[] } }[];
        }
      ).questions[0];
      expect(reviewed.correctAnswer.sequence).toEqual(stored);
    });
  });

  describe('MULTIPLE_CHOICE questions', () => {
    it('accepts exactly the correct set and nothing else', async () => {
      const { token } = await registerUser();
      const started = await start(token, {
        subjectId,
        topicId: multipleChoiceTopicId,
        questionCount: 3,
        timerEnabled: false,
      }).expect(201);
      const sessionId = (started.body as SessionMeta).sessionId;
      const questions = await getQuestions(token, sessionId);
      expect(questions[0].answerOptions).toHaveLength(7);

      const all = await correctOptionIds(questions[0].id);
      await submit(token, sessionId, {
        questionId: questions[0].id,
        selectedAnswer: { answerOptionIds: all },
      }).expect(200);

      // Two of the three right statements is wrong, as on the exam.
      const partial = (await correctOptionIds(questions[1].id)).slice(0, 2);
      await submit(token, sessionId, {
        questionId: questions[1].id,
        selectedAnswer: { answerOptionIds: partial },
      }).expect(200);

      // Three right ones plus a wrong one is wrong too.
      const stored = await storedOptionIds(questions[2].id);
      const right = await correctOptionIds(questions[2].id);
      const wrong = stored.find((id) => !right.includes(id));
      await submit(token, sessionId, {
        questionId: questions[2].id,
        selectedAnswer: { answerOptionIds: [...right, wrong as string] },
      }).expect(200);

      const finished = await complete(token, sessionId).expect(200);
      expect((finished.body as { correctAnswers: number }).correctAnswers).toBe(
        1,
      );
    });

    it('never sends isCorrect while the session is active', async () => {
      const { token } = await registerUser();
      const started = await start(token, {
        subjectId,
        topicId: multipleChoiceTopicId,
        questionCount: 3,
        timerEnabled: false,
      }).expect(201);
      const sessionId = (started.body as SessionMeta).sessionId;
      const questions = await getQuestions(token, sessionId);
      expect(JSON.stringify(questions)).not.toContain('isCorrect');
    });

    it('rejects a repeated or foreign option id with 400', async () => {
      const { token } = await registerUser();
      const started = await start(token, {
        subjectId,
        topicId: multipleChoiceTopicId,
        questionCount: 1,
        timerEnabled: false,
      }).expect(201);
      const sessionId = (started.body as SessionMeta).sessionId;
      const [question] = await getQuestions(token, sessionId);
      const right = await correctOptionIds(question.id);

      await submit(token, sessionId, {
        questionId: question.id,
        selectedAnswer: { answerOptionIds: [right[0], right[0]] },
      }).expect(400);

      await submit(token, sessionId, {
        questionId: question.id,
        selectedAnswer: { answerOptionIds: [right[0], GHOST_OPTION_ID] },
      }).expect(400);
    });

    it('lists every correct option in the review', async () => {
      const { token } = await registerUser();
      const started = await start(token, {
        subjectId,
        topicId: multipleChoiceTopicId,
        questionCount: 1,
        timerEnabled: false,
      }).expect(201);
      const sessionId = (started.body as SessionMeta).sessionId;
      const [question] = await getQuestions(token, sessionId);
      const right = await correctOptionIds(question.id);
      await submit(token, sessionId, {
        questionId: question.id,
        selectedAnswer: { answerOptionIds: right },
      }).expect(200);
      await complete(token, sessionId).expect(200);

      const review = await request(app.getHttpServer())
        .get(`/api/v1/quiz/${sessionId}/result`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      const reviewed = (
        review.body as {
          questions: {
            isCorrect: boolean;
            correctAnswer: { answerOptionIds: string[] };
          }[];
        }
      ).questions[0];
      expect(reviewed.isCorrect).toBe(true);
      expect(new Set(reviewed.correctAnswer.answerOptionIds)).toEqual(
        new Set(right),
      );
    });
  });

  describe('questions on a passage', () => {
    const startOnPassageTopic = async (
      token: string,
      questionCount: number,
    ): Promise<{ sessionId: string; questions: QuestionView[] }> => {
      const started = await start(token, {
        subjectId,
        topicId: passageTopicId,
        questionCount,
        timerEnabled: false,
      }).expect(201);
      const sessionId = (started.body as SessionMeta).sessionId;
      return { sessionId, questions: await getQuestions(token, sessionId) };
    };

    /** The passage's questions must form one unbroken run, from its first. */
    const expectOneRunInOrder = (questions: QuestionView[]): QuestionView[] => {
      const onPassage = questions.filter((question) => question.passage);
      const first = questions.indexOf(onPassage[0]);
      expect(questions.slice(first, first + onPassage.length)).toEqual(
        onPassage,
      );
      expect(onPassage.map((question) => question.passageOrder)).toEqual(
        onPassage.map((_, i) => i + 1),
      );
      return onPassage;
    };

    it('delivers the text with each of its questions, together and in order', async () => {
      const { token } = await registerUser();
      const { questions } = await startOnPassageTopic(token, 5);

      const onPassage = expectOneRunInOrder(questions);
      expect(onPassage).toHaveLength(3);
      for (const question of onPassage) {
        expect(question.passage).toEqual({
          id: passageId,
          title: 'Phase51 Story',
          content:
            'One gap (1) ______, a second (2) ______ and a third (3) ______.',
        });
      }
      for (const question of questions.filter((q) => !q.passage)) {
        expect(question.passageOrder).toBeNull();
      }
    });

    it('cuts a passage only to fill what nothing else can, from its beginning', async () => {
      // Each new reader is dealt the pool in a fresh random order, so several
      // sittings cover both outcomes: the whole text plus one loner, or both
      // loners plus the text's first two questions.
      for (let sitting = 0; sitting < 4; sitting += 1) {
        const { token } = await registerUser();
        const { questions } = await startOnPassageTopic(token, 4);

        expect(questions).toHaveLength(4);
        expect(expectOneRunInOrder(questions).length).toBeGreaterThanOrEqual(2);
      }
    });

    it('shows the text again in the review', async () => {
      const { token } = await registerUser();
      const { sessionId } = await startOnPassageTopic(token, 5);
      await complete(token, sessionId).expect(200);

      const review = await request(app.getHttpServer())
        .get(`/api/v1/quiz/${sessionId}/result`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      const reviewed = (review.body as { questions: QuestionView[] }).questions;

      expect(
        expectOneRunInOrder(reviewed).map((question) => question.passage?.id),
      ).toEqual([passageId, passageId, passageId]);
    });
  });

  describe('NUMERIC questions', () => {
    const startNumeric = async (
      token: string,
      questionCount: number,
    ): Promise<{ sessionId: string; questions: QuestionView[] }> => {
      const started = await start(token, {
        subjectId,
        topicId: numericTopicId,
        questionCount,
        timerEnabled: false,
      }).expect(201);
      const sessionId = (started.body as SessionMeta).sessionId;
      return { sessionId, questions: await getQuestions(token, sessionId) };
    };

    const expectedAnswer = async (questionId: string): Promise<number> => {
      const row = await prisma.question.findUniqueOrThrow({
        where: { id: questionId },
        select: { configuration: true },
      });
      return (row.configuration as { answer: number }).answer;
    };

    it('sends no options and no configuration', async () => {
      const { token } = await registerUser();
      const { questions } = await startNumeric(token, 3);

      for (const question of questions) {
        expect(question.type).toBe('NUMERIC');
        expect(question.answerOptions).toHaveLength(0);
      }
      // The value is the whole answer, so it must not appear anywhere in the
      // payload the learner receives.
      expect(JSON.stringify(questions)).not.toContain('configuration');
      expect(JSON.stringify(questions)).not.toContain('12.5');
    });

    it('accepts the value however it is written', async () => {
      const { token } = await registerUser();
      const { sessionId, questions } = await startNumeric(token, 3);
      const forms = new Map<number, string>([
        [12.5, '12,50'],
        [-4, '-4'],
        [0, ' 0 '],
      ]);

      for (const question of questions) {
        const answer = await expectedAnswer(question.id);
        await submit(token, sessionId, {
          questionId: question.id,
          selectedAnswer: { numericAnswer: forms.get(answer) as string },
        }).expect(200);
      }

      const finished = await complete(token, sessionId).expect(200);
      expect((finished.body as { correctAnswers: number }).correctAnswers).toBe(
        3,
      );
    });

    it('stores a wrong number, and text that is not a number, as wrong answers', async () => {
      const { token } = await registerUser();
      const { sessionId, questions } = await startNumeric(token, 3);
      const byAnswer = new Map<number, string>();
      for (const question of questions) {
        byAnswer.set(await expectedAnswer(question.id), question.id);
      }
      const questionWith = (answer: number): string => {
        const id = byAnswer.get(answer);
        if (!id) {
          throw new Error(`the session has no question answered by ${answer}`);
        }
        return id;
      };

      await submit(token, sessionId, {
        questionId: questionWith(12.5),
        selectedAnswer: { numericAnswer: '999' },
      }).expect(200);
      // Mid-typing states reach the server because every keystroke autosaves.
      await submit(token, sessionId, {
        questionId: questionWith(-4),
        selectedAnswer: { numericAnswer: '-' },
      }).expect(200);
      // The blank goes to the question whose answer is zero on purpose:
      // `Number('')` is 0, and a blank field once scored as correct there.
      // Delivery order is random, so the case has to be placed, not hoped for.
      await submit(token, sessionId, {
        questionId: questionWith(0),
        selectedAnswer: { numericAnswer: '' },
      }).expect(200);

      const finished = await complete(token, sessionId).expect(200);
      expect((finished.body as { correctAnswers: number }).correctAnswers).toBe(
        0,
      );
    });

    it('rejects a wrong answer shape with 400', async () => {
      const { token } = await registerUser();
      const { sessionId, questions } = await startNumeric(token, 1);

      await submit(token, sessionId, {
        questionId: questions[0].id,
        selectedAnswer: { answerOptionId: GHOST_OPTION_ID },
      }).expect(400);
      await submit(token, sessionId, {
        questionId: questions[0].id,
        selectedAnswer: { numericAnswer: { value: 12.5 } },
      }).expect(400);
    });

    it('reveals the expected value only in the review', async () => {
      const { token } = await registerUser();
      const { sessionId, questions } = await startNumeric(token, 1);
      const answer = await expectedAnswer(questions[0].id);
      await submit(token, sessionId, {
        questionId: questions[0].id,
        selectedAnswer: { numericAnswer: String(answer) },
      }).expect(200);
      await complete(token, sessionId).expect(200);

      const review = await request(app.getHttpServer())
        .get(`/api/v1/quiz/${sessionId}/result`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      const reviewed = (
        review.body as {
          questions: {
            isCorrect: boolean;
            correctAnswer: { numericAnswer: number };
          }[];
        }
      ).questions[0];
      expect(reviewed.isCorrect).toBe(true);
      expect(reviewed.correctAnswer.numericAnswer).toBe(answer);
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

    it('withholds the explanation until the quiz is completed', async () => {
      // An explanation is a teaching note about the answer, so serving it
      // mid-quiz would hand over the answer itself.
      const explained = await adminReq('post', '/api/v1/admin/questions', {
        topicId: secondTopicId,
        type: QuestionType.SINGLE_CHOICE,
        title: 'Phase51 explained question?',
        explanation: 'Правильна відповідь — A, бо так.',
        options: [
          { content: 'A', isCorrect: true },
          { content: 'B' },
          { content: 'C' },
        ],
      }).expect(201);
      const questionId = (explained.body as { id: string }).id;
      await adminReq('patch', `/api/v1/admin/questions/${questionId}/publish`, {
        isPublished: true,
      }).expect(200);

      const { token } = await registerUser();
      const started = await start(token, {
        subjectId,
        topicId: secondTopicId,
        questionCount: 5,
        timerEnabled: false,
      }).expect(201);
      const sessionId = (started.body as SessionMeta).sessionId;

      const questions = await getQuestions(token, sessionId);
      expect(JSON.stringify(questions)).not.toContain('бо так');

      const resume = await request(app.getHttpServer())
        .get(`/api/v1/quiz/${sessionId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(JSON.stringify(resume.body)).not.toContain('бо так');

      // Only after completion does the review carry it.
      for (const q of questions) {
        await submit(token, sessionId, {
          questionId: q.id,
          selectedAnswer: { answerOptionId: q.answerOptions[0].id },
        }).expect(200);
      }
      await complete(token, sessionId).expect(200);

      const review = await request(app.getHttpServer())
        .get(`/api/v1/quiz/${sessionId}/result`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      const reviewed = (
        review.body as {
          questions: { id: string; explanation: string | null }[];
        }
      ).questions.find((q) => q.id === questionId);
      expect(reviewed?.explanation).toBe('Правильна відповідь — A, бо так.');
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

    /**
     * Every matching question in the bank is keyed 0→4, 1→5, 2→6, 3→7, so
     * pairing the columns straight down scored full marks without reading a
     * word. The choices are therefore dealt at delivery; these cover the four
     * things that has to keep true.
     */
    describe('matching choices are dealt, not listed in key order', () => {
      const rightIdsOf = (question: QuestionView): string[] => {
        const ordered = [...question.answerOptions].sort(
          (a, b) => a.order - b.order,
        );
        return ordered.slice(Math.ceil(ordered.length / 2)).map((o) => o.id);
      };

      const startWide = async (
        token: string,
      ): Promise<{ sessionId: string; question: QuestionView }> => {
        const started = await start(token, {
          subjectId,
          topicId: wideMatchingTopicId,
          questionCount: 1,
          timerEnabled: false,
        }).expect(201);
        const sessionId = (started.body as SessionMeta).sessionId;
        const [question] = await getQuestions(token, sessionId);
        return { sessionId, question };
      };

      it('keeps the prompts and the choices on their own sides', async () => {
        const { token } = await registerUser();
        const { question } = await startWide(token);

        const ordered = [...question.answerOptions].sort(
          (a, b) => a.order - b.order,
        );
        // The client splits the flat list in half by order, so a dealt value
        // must never cross the midpoint.
        expect(ordered.slice(0, 4).map((o) => o.content)).toEqual([
          'L1',
          'L2',
          'L3',
          'L4',
        ]);
        expect(
          ordered
            .slice(4)
            .map((o) => o.content)
            .sort(),
        ).toEqual(['R1', 'R2', 'R3', 'R4']);
        expect(ordered.map((o) => o.order)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
      });

      it('still accepts the correct pairing', async () => {
        const { token } = await registerUser();
        const { sessionId, question } = await startWide(token);

        const options = await prisma.answerOption.findMany({
          where: { questionId: question.id },
          select: { id: true, order: true },
        });
        const byOrder = new Map(options.map((o) => [o.order, o.id]));

        await submit(token, sessionId, {
          questionId: question.id,
          selectedAnswer: {
            pairs: [
              { left: byOrder.get(0), right: byOrder.get(4) },
              { left: byOrder.get(1), right: byOrder.get(5) },
              { left: byOrder.get(2), right: byOrder.get(6) },
              { left: byOrder.get(3), right: byOrder.get(7) },
            ],
          },
        }).expect(200);
        await complete(token, sessionId).expect(200);

        const attempt = await prisma.questionAttempt.findFirstOrThrow({
          where: { quizSessionId: sessionId, questionId: question.id },
        });
        expect(attempt.isCorrect).toBe(true);
      });

      it('deals the same order on resume and in the review', async () => {
        const { token } = await registerUser();
        const { sessionId, question } = await startWide(token);
        const dealt = rightIdsOf(question);

        const [again] = await getQuestions(token, sessionId);
        expect(rightIdsOf(again)).toEqual(dealt);

        // Completed without answering: the review still has to show the same
        // cards the reader was looking at.
        await complete(token, sessionId).expect(200);

        const review = await request(app.getHttpServer())
          .get(`/api/v1/quiz/${sessionId}/result`)
          .set('Authorization', `Bearer ${token}`)
          .expect(200);
        const reviewed = (review.body as { questions: QuestionView[] })
          .questions[0];
        expect(rightIdsOf(reviewed)).toEqual(dealt);
      });

      it('does not deal every session the same way', async () => {
        // Seeded per session, so six deals landing on one order would mean the
        // shuffle is not running. With 4! orders that is (1/24)^5 by chance.
        const seen = new Set<string>();
        for (let i = 0; i < 6; i += 1) {
          const { token } = await registerUser();
          const { question } = await startWide(token);
          seen.add(rightIdsOf(question).join());
        }
        expect(seen.size).toBeGreaterThan(1);
      });
    });

    /**
     * The NMT format: more choices than prompts, with the spare ones part of
     * the task rather than an authoring slip.
     */
    describe('matching with spare choices (NMT format)', () => {
      it('states where the prompts end and keeps the spare choice out of them', async () => {
        const { token } = await registerUser();
        const started = await start(token, {
          subjectId,
          topicId: nmtMatchingTopicId,
          questionCount: 1,
          timerEnabled: false,
        }).expect(201);
        const sessionId = (started.body as SessionMeta).sessionId;
        const [question] = await getQuestions(token, sessionId);

        // Four prompts, five choices — halving nine would have put a choice
        // in the prompt column.
        expect(question.promptCount).toBe(4);
        const ordered = [...question.answerOptions].sort(
          (a, b) => a.order - b.order,
        );
        expect(ordered).toHaveLength(9);
        expect(ordered.slice(0, 4).map((o) => o.content)).toEqual([
          'P1',
          'P2',
          'P3',
          'P4',
        ]);
        expect(
          ordered
            .slice(4)
            .map((o) => o.content)
            .sort(),
        ).toEqual(['C1', 'C2', 'C3', 'C4', 'SPARE']);
      });

      it('accepts the correct pairing and leaves the spare choice unused', async () => {
        const { token } = await registerUser();
        const started = await start(token, {
          subjectId,
          topicId: nmtMatchingTopicId,
          questionCount: 1,
          timerEnabled: false,
        }).expect(201);
        const sessionId = (started.body as SessionMeta).sessionId;
        const [question] = await getQuestions(token, sessionId);

        const options = await prisma.answerOption.findMany({
          where: { questionId: question.id },
          select: { id: true, order: true },
        });
        const byOrder = new Map(options.map((o) => [o.order, o.id]));

        await submit(token, sessionId, {
          questionId: question.id,
          selectedAnswer: {
            pairs: [
              { left: byOrder.get(0), right: byOrder.get(4) },
              { left: byOrder.get(1), right: byOrder.get(5) },
              { left: byOrder.get(2), right: byOrder.get(6) },
              { left: byOrder.get(3), right: byOrder.get(7) },
            ],
          },
        }).expect(200);
        await complete(token, sessionId).expect(200);

        const attempt = await prisma.questionAttempt.findFirstOrThrow({
          where: { quizSessionId: sessionId, questionId: question.id },
        });
        expect(attempt.isCorrect).toBe(true);
      });

      it('rejects a key whose prompts are not the opening block', async () => {
        // Prompts 0 and 2 with a choice wedged between them: the client
        // divides the list at a single point, so a scattered prompt block
        // cannot be drawn.
        await adminReq('post', '/api/v1/admin/questions', {
          topicId: nmtMatchingTopicId,
          type: QuestionType.MATCHING,
          title: 'Phase51 ScatteredPrompts?',
          options: [
            { content: 'P1' },
            { content: 'C1' },
            { content: 'P2' },
            { content: 'C2' },
          ],
          configuration: {
            pairs: [
              { left: 0, right: 1 },
              { left: 2, right: 3 },
            ],
          },
        }).expect(400);
      });
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
              { left: byOrder.get(0), right: byOrder.get(2) },
              { left: byOrder.get(1), right: byOrder.get(3) },
            ],
          };
        }
        // Swap the right sides → wrong.
        return {
          pairs: [
            { left: byOrder.get(0), right: byOrder.get(3) },
            { left: byOrder.get(1), right: byOrder.get(2) },
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
          explanation: string | null;
        }[];
      };

      expect(body.result.totalQuestions).toBe(3);
      expect(body.questions).toHaveLength(3);
      for (const q of body.questions) {
        expect(q.correctAnswer).toHaveProperty('optionId');
        expect(q).toHaveProperty('isCorrect');
        // These fixtures carry no explanation of their own.
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
