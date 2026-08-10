import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AccountStatus, QuizType, UserRole } from '@prisma/client';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

interface QuizBody {
  id: string;
  subjectId: string;
  topicId: string | null;
  title: string;
  description: string | null;
  mode: string;
  questionCount: number;
  timerEnabled: boolean;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PageBody {
  items: QuizBody[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

const GHOST_ID = '00000000-0000-0000-0000-000000000000';

/**
 * Admin Quiz Management (configuration CRUD) e2e — Phase 5.4
 * (docs/04-api/admin.md §8).
 */
describe('Admin Quizzes (e2e)', () => {
  const EMAIL_PREFIX = 'phase54-quiz';
  const USERNAME_PREFIX = 'phase54quiz';
  const SLUG_PREFIX = 'p54';
  const PASSWORD = 'ValidPass1!';
  const QUIZZES_URL = '/api/v1/admin/quizzes';

  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let userToken: string;
  let subjectId: string;
  let subjectB: string;
  let topicId: string;
  let counter = 0;

  const registerAccount = async (role: UserRole): Promise<string> => {
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
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: PASSWORD })
      .expect(200);
    return (login.body as { accessToken: string }).accessToken;
  };

  const createSubject = async (label: string): Promise<string> => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/admin/subjects')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `Phase54 Subject ${label}`,
        slug: `${SLUG_PREFIX}-subject-${label}`,
      })
      .expect(201);
    return (res.body as { id: string }).id;
  };

  const createTopic = async (
    parent: string,
    label: string,
  ): Promise<string> => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/admin/topics')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        subjectId: parent,
        name: `Phase54 Topic ${label}`,
        slug: `${SLUG_PREFIX}-topic-${label}`,
      })
      .expect(201);
    return (res.body as { id: string }).id;
  };

  const basePayload = (
    overrides: Record<string, unknown> = {},
  ): Record<string, unknown> => {
    counter += 1;
    return {
      subjectId,
      title: `Phase54 Quiz ${counter}`,
      mode: QuizType.SUBJECT_QUIZ,
      questionCount: 10,
      ...overrides,
    };
  };

  const createQuiz = async (
    payload: Record<string, unknown>,
    expectedStatus = 201,
  ): Promise<QuizBody> => {
    const res = await request(app.getHttpServer())
      .post(QUIZZES_URL)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(payload)
      .expect(expectedStatus);
    return res.body as QuizBody;
  };

  const updateQuiz = async (
    id: string,
    payload: Record<string, unknown>,
    expectedStatus = 200,
  ): Promise<QuizBody> => {
    const res = await request(app.getHttpServer())
      .put(`${QUIZZES_URL}/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(payload)
      .expect(expectedStatus);
    return res.body as QuizBody;
  };

  const listQuizzes = async (query = ''): Promise<PageBody> => {
    const res = await request(app.getHttpServer())
      .get(`${QUIZZES_URL}${query}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    return res.body as PageBody;
  };

  const removeTestData = async (): Promise<void> => {
    await prisma.quiz.deleteMany({
      where: { subject: { slug: { startsWith: SLUG_PREFIX } } },
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

    adminToken = await registerAccount(UserRole.ADMIN);
    userToken = await registerAccount(UserRole.USER);
    subjectId = await createSubject('a');
    subjectB = await createSubject('b');
    topicId = await createTopic(subjectId, 'a');
  });

  afterAll(async () => {
    await removeTestData();
    await app.close();
  });

  describe('route protection', () => {
    it.each([
      ['GET', 'get', QUIZZES_URL],
      ['POST', 'post', QUIZZES_URL],
      ['PUT', 'put', `${QUIZZES_URL}/${GHOST_ID}`],
      ['DELETE', 'delete', `${QUIZZES_URL}/${GHOST_ID}`],
    ] as const)(
      '%s rejects a missing token with 401',
      async (_n, method, url) => {
        await request(app.getHttpServer())[method](url).expect(401);
      },
    );

    it.each([
      ['GET', 'get', QUIZZES_URL],
      ['POST', 'post', QUIZZES_URL],
      ['PUT', 'put', `${QUIZZES_URL}/${GHOST_ID}`],
      ['DELETE', 'delete', `${QUIZZES_URL}/${GHOST_ID}`],
    ] as const)('%s rejects a non-admin with 403', async (_n, method, url) => {
      await request(app.getHttpServer())
        [method](url)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  describe('POST /admin/quizzes', () => {
    it('creates a quiz with defaults (timerEnabled=false, isPublished=false)', async () => {
      const payload = basePayload({ topicId, description: 'A quiz' });
      const body = await createQuiz(payload);
      expect(body).toMatchObject({
        subjectId,
        topicId,
        title: payload.title,
        description: 'A quiz',
        mode: QuizType.SUBJECT_QUIZ,
        questionCount: 10,
        timerEnabled: false,
        isPublished: false,
      });
      expect(body.id).toBeDefined();
      expect(body).not.toHaveProperty('deletedAt');
    });

    it('persists mode verbatim (RANDOM_QUIZ with a topicId is allowed)', async () => {
      const body = await createQuiz(
        basePayload({ mode: QuizType.RANDOM_QUIZ, topicId }),
      );
      // Mode is NOT derived from topicId (decision Q7).
      expect(body.mode).toBe(QuizType.RANDOM_QUIZ);
      expect(body.topicId).toBe(topicId);
    });

    it('accepts isPublished and timerEnabled at creation', async () => {
      const body = await createQuiz(
        basePayload({ isPublished: true, timerEnabled: true }),
      );
      expect(body.isPublished).toBe(true);
      expect(body.timerEnabled).toBe(true);
    });

    it('returns 404 for an unknown or soft-deleted subject', async () => {
      const body = await createQuiz(basePayload({ subjectId: GHOST_ID }), 404);
      expect(body).toMatchObject({
        statusCode: 404,
        message: 'Предмет не знайдено.',
      });

      const doomed = await createSubject('doomed');
      await request(app.getHttpServer())
        .delete(`/api/v1/admin/subjects/${doomed}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);
      await createQuiz(basePayload({ subjectId: doomed }), 404);
    });

    it('returns 404 for an unknown topic', async () => {
      await createQuiz(basePayload({ topicId: GHOST_ID }), 404);
    });

    it.each<[string, Record<string, unknown>]>([
      [
        'missing subjectId',
        { title: 'x', mode: QuizType.SUBJECT_QUIZ, questionCount: 5 },
      ],
      [
        'non-uuid subjectId',
        {
          subjectId: 'x',
          title: 'x',
          mode: QuizType.SUBJECT_QUIZ,
          questionCount: 5,
        },
      ],
      [
        'missing title',
        { subjectId: 'SUBJECT', mode: QuizType.SUBJECT_QUIZ, questionCount: 5 },
      ],
      [
        'empty title',
        {
          subjectId: 'SUBJECT',
          title: '  ',
          mode: QuizType.SUBJECT_QUIZ,
          questionCount: 5,
        },
      ],
      [
        'title too long',
        {
          subjectId: 'SUBJECT',
          title: 'a'.repeat(101),
          mode: QuizType.SUBJECT_QUIZ,
          questionCount: 5,
        },
      ],
      [
        'bad mode',
        {
          subjectId: 'SUBJECT',
          title: 'x',
          mode: 'MOCK_EXAM',
          questionCount: 5,
        },
      ],
      [
        'questionCount 0',
        {
          subjectId: 'SUBJECT',
          title: 'x',
          mode: QuizType.SUBJECT_QUIZ,
          questionCount: 0,
        },
      ],
      [
        'questionCount 51',
        {
          subjectId: 'SUBJECT',
          title: 'x',
          mode: QuizType.SUBJECT_QUIZ,
          questionCount: 51,
        },
      ],
      [
        'description too long',
        {
          subjectId: 'SUBJECT',
          title: 'x',
          mode: QuizType.SUBJECT_QUIZ,
          questionCount: 5,
          description: 'a'.repeat(501),
        },
      ],
      [
        'unknown field',
        {
          subjectId: 'SUBJECT',
          title: 'x',
          mode: QuizType.SUBJECT_QUIZ,
          questionCount: 5,
          foo: 1,
        },
      ],
    ])('rejects %s with 400', async (_n, payload) => {
      const resolved =
        payload.subjectId === 'SUBJECT' ? { ...payload, subjectId } : payload;
      await createQuiz(resolved, 400);
    });
  });

  describe('GET /admin/quizzes', () => {
    it('returns the envelope with defaults, newest first', async () => {
      const older = await createQuiz(basePayload());
      const newer = await createQuiz(basePayload());
      const body = await listQuizzes();
      expect(body.page).toBe(1);
      expect(body.pageSize).toBe(20);
      expect(body.totalPages).toBe(Math.ceil(body.totalItems / 20));
      const ids = body.items.map((q) => q.id);
      expect(ids.indexOf(newer.id)).toBeLessThan(ids.indexOf(older.id));
    });

    it('filters by subjectId, topicId, and isPublished', async () => {
      const inB = await createQuiz(basePayload({ subjectId: subjectB }));
      const published = await createQuiz(basePayload({ isPublished: true }));

      const byB = await listQuizzes(`?subjectId=${subjectB}&pageSize=100`);
      expect(byB.items.every((q) => q.subjectId === subjectB)).toBe(true);
      expect(byB.items.some((q) => q.id === inB.id)).toBe(true);

      const byTopic = await listQuizzes(`?topicId=${topicId}&pageSize=100`);
      expect(byTopic.items.every((q) => q.topicId === topicId)).toBe(true);

      const pub = await listQuizzes('?isPublished=true&pageSize=100');
      expect(pub.items.some((q) => q.id === published.id)).toBe(true);
      expect(pub.items.every((q) => q.isPublished)).toBe(true);
    });

    it('searches the title and sorts by title', async () => {
      const created = await createQuiz(
        basePayload({ title: 'Phase54 Distinctive Marker' }),
      );
      const found = await listQuizzes('?search=distinctive%20marker');
      expect(found.items.some((q) => q.id === created.id)).toBe(true);

      const sorted = await listQuizzes(
        '?sortBy=title&sortOrder=asc&pageSize=100',
      );
      const titles = sorted.items.map((q) => q.title);
      expect(titles).toEqual([...titles].sort());
    });

    it.each([
      ['page=0', '?page=0'],
      ['pageSize>100', '?pageSize=101'],
      ['non-uuid subjectId', '?subjectId=x'],
      ['bad sortBy', '?sortBy=questionCount'],
      ['bad isPublished', '?isPublished=yes'],
      ['unknown param', '?foo=bar'],
    ])('rejects %s with 400', async (_n, query) => {
      await request(app.getHttpServer())
        .get(`${QUIZZES_URL}${query}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });
  });

  describe('PUT /admin/quizzes/{id}', () => {
    it('merges: only supplied fields change; null clears description', async () => {
      const created = await createQuiz(
        basePayload({ description: 'Original', topicId }),
      );
      const renamed = await updateQuiz(created.id, { title: 'Renamed' });
      expect(renamed).toMatchObject({
        title: 'Renamed',
        description: 'Original',
        topicId,
        questionCount: 10,
      });
      const cleared = await updateQuiz(created.id, { description: null });
      expect(cleared.description).toBeNull();
    });

    it('publishes/unpublishes and updates mode + questionCount', async () => {
      const created = await createQuiz(basePayload());
      const pub = await updateQuiz(created.id, {
        isPublished: true,
        questionCount: 25,
      });
      expect(pub.isPublished).toBe(true);
      expect(pub.questionCount).toBe(25);
      const changed = await updateQuiz(created.id, {
        mode: QuizType.RANDOM_QUIZ,
      });
      expect(changed.mode).toBe(QuizType.RANDOM_QUIZ);
    });

    it('detaches the topic with topicId:null and re-attaches a valid topic', async () => {
      const created = await createQuiz(basePayload({ topicId }));
      const detached = await updateQuiz(created.id, { topicId: null });
      expect(detached.topicId).toBeNull();
      const reattached = await updateQuiz(created.id, { topicId });
      expect(reattached.topicId).toBe(topicId);
    });

    it('rejects an immutable subjectId and an unknown topic', async () => {
      const created = await createQuiz(basePayload());
      // subjectId is not in the DTO → whitelist 400.
      await updateQuiz(created.id, { subjectId: subjectB }, 400);
      await updateQuiz(created.id, { topicId: GHOST_ID }, 404);
    });

    it('returns 404 for an unknown id and 400 for a malformed id', async () => {
      await updateQuiz(GHOST_ID, { title: 'x' }, 404);
      await request(app.getHttpServer())
        .put(`${QUIZZES_URL}/not-a-uuid`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'x' })
        .expect(400);
    });
  });

  describe('DELETE /admin/quizzes/{id}', () => {
    it('soft deletes: 204, hidden from listings, row retained', async () => {
      const created = await createQuiz(basePayload());
      await request(app.getHttpServer())
        .delete(`${QUIZZES_URL}/${created.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);

      const list = await listQuizzes('?pageSize=100');
      expect(list.items.some((q) => q.id === created.id)).toBe(false);

      const row = await prisma.quiz.findUnique({ where: { id: created.id } });
      expect(row).not.toBeNull();
      expect(row!.deletedAt).not.toBeNull();
    });

    it('returns 404 on repeat delete and on updating a deleted quiz', async () => {
      const created = await createQuiz(basePayload());
      await request(app.getHttpServer())
        .delete(`${QUIZZES_URL}/${created.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);
      await request(app.getHttpServer())
        .delete(`${QUIZZES_URL}/${created.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
      await updateQuiz(created.id, { title: 'Ghost' }, 404);
    });
  });
});
