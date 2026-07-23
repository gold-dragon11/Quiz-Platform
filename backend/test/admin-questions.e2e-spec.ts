import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  AccountStatus,
  Difficulty,
  Language,
  QuestionType,
  UserRole,
} from '@prisma/client';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

interface OptionBody {
  id: string;
  content: string;
  imageUrl: string | null;
  isCorrect: boolean;
  order: number;
}

interface QuestionBody {
  id: string;
  topicId: string;
  type: string;
  title: string;
  imageUrl: string | null;
  difficulty: string | null;
  configuration: Record<string, unknown> | null;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  answerOptions: OptionBody[];
}

interface PageBody {
  items: QuestionBody[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

const GHOST_ID = '00000000-0000-0000-0000-000000000000';

/**
 * Admin Questions CRUD end-to-end tests (docs/04-api/admin.md §6-7, §10).
 */
describe('Admin Questions (e2e)', () => {
  const EMAIL_PREFIX = 'phase43-q';
  const USERNAME_PREFIX = 'phase43q';
  const SLUG_PREFIX = 'p43';
  const PASSWORD = 'ValidPass1!';
  const REGISTER_URL = '/api/v1/auth/register';
  const LOGIN_URL = '/api/v1/auth/login';
  const SUBJECTS_URL = '/api/v1/admin/subjects';
  const TOPICS_URL = '/api/v1/admin/topics';
  const QUESTIONS_URL = '/api/v1/admin/questions';

  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let userToken: string;
  let subjectId: string;
  let topicId: string;
  let otherTopicId: string;
  let counter = 0;

  const singleChoicePayload = (
    overrides: Record<string, unknown> = {},
  ): Record<string, unknown> => {
    counter += 1;
    return {
      topicId,
      type: QuestionType.SINGLE_CHOICE,
      title: `Phase43 single choice ${counter}?`,
      options: [
        { content: 'Correct', isCorrect: true },
        { content: 'Wrong A' },
        { content: 'Wrong B' },
      ],
      ...overrides,
    };
  };

  const matchingPayload = (
    overrides: Record<string, unknown> = {},
  ): Record<string, unknown> => {
    counter += 1;
    return {
      topicId,
      type: QuestionType.MATCHING,
      title: `Phase43 matching ${counter}?`,
      options: [
        { content: 'Left 1' },
        { content: 'Right 1' },
        { content: 'Left 2' },
        { content: 'Right 2' },
      ],
      configuration: {
        pairs: [
          { left: 0, right: 1 },
          { left: 2, right: 3 },
        ],
      },
      ...overrides,
    };
  };

  const registerAccount = async (role: UserRole): Promise<string> => {
    counter += 1;
    const email = `${EMAIL_PREFIX}-${counter}@example.com`;
    const username = `${USERNAME_PREFIX}${counter}`;

    await request(app.getHttpServer())
      .post(REGISTER_URL)
      .send({ email, username, password: PASSWORD })
      .expect(201);

    await prisma.user.update({
      where: { email },
      data: { accountStatus: AccountStatus.ACTIVE, role },
    });

    const response = await request(app.getHttpServer())
      .post(LOGIN_URL)
      .send({ email, password: PASSWORD })
      .expect(200);

    return (response.body as { accessToken: string }).accessToken;
  };

  const createFixtureSubject = async (label: string): Promise<string> => {
    const response = await request(app.getHttpServer())
      .post(SUBJECTS_URL)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `Phase43 Subject ${label}`,
        slug: `${SLUG_PREFIX}-subject-${label}`,
      })
      .expect(201);
    return (response.body as { id: string }).id;
  };

  const createFixtureTopic = async (
    parent: string,
    label: string,
  ): Promise<string> => {
    const response = await request(app.getHttpServer())
      .post(TOPICS_URL)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        subjectId: parent,
        name: `Phase43 Topic ${label}`,
        slug: `${SLUG_PREFIX}-topic-${label}`,
      })
      .expect(201);
    return (response.body as { id: string }).id;
  };

  const createQuestion = async (
    payload: Record<string, unknown>,
    expectedStatus = 201,
  ): Promise<QuestionBody> => {
    const response = await request(app.getHttpServer())
      .post(QUESTIONS_URL)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(payload)
      .expect(expectedStatus);
    return response.body as QuestionBody;
  };

  const updateQuestion = async (
    id: string,
    payload: Record<string, unknown>,
    expectedStatus = 200,
  ): Promise<Record<string, unknown>> => {
    const response = await request(app.getHttpServer())
      .put(`${QUESTIONS_URL}/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(payload)
      .expect(expectedStatus);
    return response.body as Record<string, unknown>;
  };

  const publishQuestion = async (
    id: string,
    payload: Record<string, unknown>,
    expectedStatus = 200,
  ): Promise<Record<string, unknown>> => {
    const response = await request(app.getHttpServer())
      .patch(`${QUESTIONS_URL}/${id}/publish`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(payload)
      .expect(expectedStatus);
    return response.body as Record<string, unknown>;
  };

  const deleteQuestion = async (
    id: string,
    expectedStatus = 204,
  ): Promise<void> => {
    await request(app.getHttpServer())
      .delete(`${QUESTIONS_URL}/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(expectedStatus);
  };

  const listQuestions = async (query = ''): Promise<PageBody> => {
    const response = await request(app.getHttpServer())
      .get(`${QUESTIONS_URL}${query}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    return response.body as PageBody;
  };

  const removeTestData = async (): Promise<void> => {
    // Hard cleanup of fixtures only — options and translations cascade.
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

    adminToken = await registerAccount(UserRole.ADMIN);
    userToken = await registerAccount(UserRole.USER);
    subjectId = await createFixtureSubject('main');
    topicId = await createFixtureTopic(subjectId, 'main');
    otherTopicId = await createFixtureTopic(subjectId, 'other');
  });

  afterAll(async () => {
    await removeTestData();
    await app.close();
  });

  describe('route protection', () => {
    it.each([
      ['GET list', 'get', QUESTIONS_URL],
      ['POST create', 'post', QUESTIONS_URL],
      ['PUT update', 'put', `${QUESTIONS_URL}/${GHOST_ID}`],
      ['PATCH publish', 'patch', `${QUESTIONS_URL}/${GHOST_ID}/publish`],
      ['DELETE remove', 'delete', `${QUESTIONS_URL}/${GHOST_ID}`],
    ] as const)(
      '%s rejects a missing token with 401',
      async (_name, method, url) => {
        await request(app.getHttpServer())[method](url).expect(401);
      },
    );

    it.each([
      ['GET list', 'get', QUESTIONS_URL],
      ['POST create', 'post', QUESTIONS_URL],
      ['PUT update', 'put', `${QUESTIONS_URL}/${GHOST_ID}`],
      ['PATCH publish', 'patch', `${QUESTIONS_URL}/${GHOST_ID}/publish`],
      ['DELETE remove', 'delete', `${QUESTIONS_URL}/${GHOST_ID}`],
    ] as const)(
      '%s rejects a non-admin with 403',
      async (_name, method, url) => {
        await request(app.getHttpServer())
          [method](url)
          .set('Authorization', `Bearer ${userToken}`)
          .expect(403);
      },
    );
  });

  describe('POST /admin/questions — SINGLE_CHOICE', () => {
    it('creates a question with auto-ordered options and returns it', async () => {
      const payload = singleChoicePayload({
        imageUrl: 'https://example.com/fig.png',
        difficulty: Difficulty.BEGINNER,
      });
      const body = await createQuestion(payload);

      expect(body).toMatchObject({
        topicId,
        type: QuestionType.SINGLE_CHOICE,
        title: payload.title,
        imageUrl: 'https://example.com/fig.png',
        difficulty: Difficulty.BEGINNER,
        configuration: null,
        isPublished: false,
      });
      expect(body).not.toHaveProperty('deletedAt');
      expect(body).not.toHaveProperty('explanation');
      expect(body.answerOptions).toHaveLength(3);
      expect(body.answerOptions.map((o) => o.order)).toEqual([0, 1, 2]);
      expect(body.answerOptions.filter((o) => o.isCorrect)).toHaveLength(1);
    });

    it('honors explicit option orders', async () => {
      const body = await createQuestion(
        singleChoicePayload({
          options: [
            { content: 'Correct', isCorrect: true, order: 10 },
            { content: 'Wrong', order: 5 },
          ],
        }),
      );

      // Options come back sorted by order.
      expect(body.answerOptions.map((o) => o.order)).toEqual([5, 10]);
    });

    it('returns 404 for an unknown and a soft-deleted parent topic', async () => {
      await createQuestion(singleChoicePayload({ topicId: GHOST_ID }), 404);

      const doomed = await createFixtureTopic(subjectId, 'doomed');
      await request(app.getHttpServer())
        .delete(`${TOPICS_URL}/${doomed}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);
      await createQuestion(singleChoicePayload({ topicId: doomed }), 404);
    });

    it.each([
      ['one option', { options: [{ content: 'Only', isCorrect: true }] }],
      ['no correct option', { options: [{ content: 'A' }, { content: 'B' }] }],
      [
        'two correct options',
        {
          options: [
            { content: 'A', isCorrect: true },
            { content: 'B', isCorrect: true },
          ],
        },
      ],
      [
        'configuration on single choice',
        { configuration: { pairs: [{ left: 0, right: 1 }] } },
      ],
      [
        'option ids at creation',
        {
          options: [
            { id: GHOST_ID, content: 'A', isCorrect: true },
            { content: 'B' },
          ],
        },
      ],
      [
        'mixed order presence',
        {
          options: [
            { content: 'A', isCorrect: true, order: 0 },
            { content: 'B' },
          ],
        },
      ],
      [
        'duplicate orders',
        {
          options: [
            { content: 'A', isCorrect: true, order: 1 },
            { content: 'B', order: 1 },
          ],
        },
      ],
      [
        'option without content',
        { options: [{ isCorrect: true }, { content: 'B' }] },
      ],
      ['isPublished at creation', { isPublished: true }],
      ['explanation field', { explanation: 'Because.' }],
      ['locale at creation', { locale: Language.UKRAINIAN }],
      ['empty title', { title: '' }],
      ['title too long', { title: 'a'.repeat(2001) }],
      ['bad difficulty', { difficulty: 'IMPOSSIBLE' }],
      ['bad type', { type: 'TRUE_FALSE' }],
      [
        'option content too long',
        {
          options: [
            { content: 'a'.repeat(501), isCorrect: true },
            { content: 'B' },
          ],
        },
      ],
    ])('rejects %s with 400', async (_name, overrides) => {
      await createQuestion(singleChoicePayload(overrides), 400);
    });
  });

  describe('POST /admin/questions — MATCHING', () => {
    it('creates a matching question; correctness lives in configuration only', async () => {
      const body = await createQuestion(matchingPayload());

      expect(body.type).toBe(QuestionType.MATCHING);
      expect(body.configuration).toEqual({
        pairs: [
          { left: 0, right: 1 },
          { left: 2, right: 3 },
        ],
      });
      expect(body.answerOptions).toHaveLength(4);
      expect(body.answerOptions.every((o) => !o.isCorrect)).toBe(true);
    });

    it.each([
      ['missing configuration', { configuration: undefined }],
      [
        'isCorrect on a matching option',
        {
          options: [{ content: 'L', isCorrect: true }, { content: 'R' }],
          configuration: { pairs: [{ left: 0, right: 1 }] },
        },
      ],
      ['empty pairs', { configuration: { pairs: [] } }],
      [
        'unknown order in a pair',
        {
          configuration: {
            pairs: [
              { left: 0, right: 9 },
              { left: 2, right: 3 },
            ],
          },
        },
      ],
      [
        'order used twice',
        {
          configuration: {
            pairs: [
              { left: 0, right: 1 },
              { left: 0, right: 2 },
            ],
          },
        },
      ],
      [
        'unpaired options',
        { configuration: { pairs: [{ left: 0, right: 1 }] } },
      ],
      [
        'extra configuration key',
        {
          configuration: {
            pairs: [
              { left: 0, right: 1 },
              { left: 2, right: 3 },
            ],
            extra: true,
          },
        },
      ],
      [
        'pair with missing keys',
        { configuration: { pairs: [{ left: 0 }, { left: 2, right: 3 }] } },
      ],
    ])('rejects %s with 400', async (_name, overrides) => {
      await createQuestion(matchingPayload(overrides), 400);
    });
  });

  describe('GET /admin/questions', () => {
    it('returns the envelope with defaults, newest first, including options and configuration', async () => {
      const older = await createQuestion(singleChoicePayload());
      const newer = await createQuestion(matchingPayload());

      const body = await listQuestions();

      expect(body.page).toBe(1);
      expect(body.pageSize).toBe(20);
      expect(body.totalPages).toBe(Math.ceil(body.totalItems / 20));

      const ids = body.items.map((q) => q.id);
      expect(ids.indexOf(newer.id)).toBeLessThan(ids.indexOf(older.id));

      const matching = body.items.find((q) => q.id === newer.id);
      expect(matching?.answerOptions).toHaveLength(4);
      expect(matching?.configuration).toEqual(newer.configuration);
    });

    it('filters by topicId, subjectId, type, difficulty, and isPublished', async () => {
      const inOther = await createQuestion(
        singleChoicePayload({
          topicId: otherTopicId,
          difficulty: Difficulty.ADVANCED,
        }),
      );
      await publishQuestion(inOther.id, { isPublished: true });

      const byTopic = await listQuestions(
        `?topicId=${otherTopicId}&pageSize=100`,
      );
      expect(byTopic.items.every((q) => q.topicId === otherTopicId)).toBe(true);
      expect(byTopic.items.some((q) => q.id === inOther.id)).toBe(true);

      const bySubject = await listQuestions(
        `?subjectId=${subjectId}&pageSize=100`,
      );
      expect(bySubject.items.some((q) => q.id === inOther.id)).toBe(true);

      const byType = await listQuestions(`?type=MATCHING&pageSize=100`);
      expect(byType.items.every((q) => q.type === QuestionType.MATCHING)).toBe(
        true,
      );

      const byDifficulty = await listQuestions(
        '?difficulty=ADVANCED&pageSize=100',
      );
      expect(byDifficulty.items.some((q) => q.id === inOther.id)).toBe(true);
      expect(
        byDifficulty.items.every((q) => q.difficulty === Difficulty.ADVANCED),
      ).toBe(true);

      const published = await listQuestions('?isPublished=true&pageSize=100');
      expect(published.items.some((q) => q.id === inOther.id)).toBe(true);
      const unpublished = await listQuestions(
        '?isPublished=false&pageSize=100',
      );
      expect(unpublished.items.some((q) => q.id === inOther.id)).toBe(false);
    });

    it('searches the title case-insensitively and sorts by title', async () => {
      const created = await createQuestion(
        singleChoicePayload({ title: 'Phase43 Unmistakable Needle?' }),
      );

      const found = await listQuestions('?search=unmistakable%20needle');
      expect(found.items.some((q) => q.id === created.id)).toBe(true);

      const sorted = await listQuestions(
        '?sortBy=title&sortOrder=asc&pageSize=100',
      );
      const titles = sorted.items.map((q) => q.title);
      expect(titles).toEqual([...titles].sort());
    });

    it.each([
      ['page=0', '?page=0'],
      ['pageSize>100', '?pageSize=101'],
      ['non-uuid topicId', '?topicId=abc'],
      ['bad type', '?type=ESSAY'],
      ['bad difficulty', '?difficulty=EXTREME'],
      ['bad sortBy', '?sortBy=difficulty'],
      ['unknown param', '?foo=bar'],
    ])('rejects %s with 400', async (_name, query) => {
      await request(app.getHttpServer())
        .get(`${QUESTIONS_URL}${query}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });
  });

  describe('PUT /admin/questions/{id}', () => {
    it('merges scalars without touching options; null clears imageUrl and difficulty', async () => {
      const created = await createQuestion(
        singleChoicePayload({
          imageUrl: 'https://example.com/a.png',
          difficulty: Difficulty.INTERMEDIATE,
        }),
      );

      const renamed = await updateQuestion(created.id, {
        title: 'Phase43 renamed?',
      });
      expect(renamed.title).toBe('Phase43 renamed?');
      expect(renamed.imageUrl).toBe('https://example.com/a.png');
      expect((renamed.answerOptions as OptionBody[]).length).toBe(3);

      const cleared = await updateQuestion(created.id, {
        imageUrl: null,
        difficulty: null,
      });
      expect(cleared.imageUrl).toBeNull();
      expect(cleared.difficulty).toBeNull();
    });

    it.each([
      ['type', { type: QuestionType.MATCHING }],
      ['isPublished', { isPublished: true }],
      ['explanation', { explanation: 'Because.' }],
    ])('rejects %s in the update body with 400', async (_name, payload) => {
      const created = await createQuestion(singleChoicePayload());
      await updateQuestion(created.id, payload, 400);
    });

    it('merges the option set by id: update, create, delete, reorder', async () => {
      const created = await createQuestion(singleChoicePayload());
      const [correct, wrongA, wrongB] = created.answerOptions;

      const body = await updateQuestion(created.id, {
        options: [
          // Keep the correct one but edit its content.
          { id: correct.id, content: 'Correct v2' },
          // Keep wrong A untouched.
          { id: wrongA.id },
          // Replace wrong B with a brand-new option (wrongB deleted).
          { content: 'Brand new wrong' },
        ],
      });

      const options = body.answerOptions as OptionBody[];
      expect(options).toHaveLength(3);
      // Orders reassigned from array position.
      expect(options.map((o) => o.order)).toEqual([0, 1, 2]);
      expect(options[0]).toMatchObject({
        id: correct.id,
        content: 'Correct v2',
        isCorrect: true,
      });
      expect(options[1]).toMatchObject({
        id: wrongA.id,
        content: wrongA.content,
      });
      expect(options[2].content).toBe('Brand new wrong');
      expect(options.some((o) => o.id === wrongB.id)).toBe(false);

      const deletedRow = await prisma.answerOption.findUnique({
        where: { id: wrongB.id },
      });
      expect(deletedRow).toBeNull();
    });

    it('re-validates the merged set: correctness rules hold after edits', async () => {
      const created = await createQuestion(singleChoicePayload());
      const [correct, wrongA, wrongB] = created.answerOptions;

      // Deleting the correct option leaves zero correct → 400.
      await updateQuestion(
        created.id,
        { options: [{ id: wrongA.id }, { id: wrongB.id }] },
        400,
      );

      // Flipping a wrong one to correct leaves two correct → 400.
      await updateQuestion(
        created.id,
        {
          options: [
            { id: correct.id },
            { id: wrongA.id, isCorrect: true },
            { id: wrongB.id },
          ],
        },
        400,
      );

      // Moving correctness is fine.
      await updateQuestion(created.id, {
        options: [
          { id: correct.id, isCorrect: false },
          { id: wrongA.id, isCorrect: true },
          { id: wrongB.id },
        ],
      });
    });

    it.each([
      ['a single-entry option set', (o: OptionBody[]) => [{ id: o[0].id }]],
      [
        'an unknown option id',
        (o: OptionBody[]) => [{ id: o[0].id }, { id: GHOST_ID }],
      ],
      [
        'a duplicate option id',
        (o: OptionBody[]) => [{ id: o[0].id }, { id: o[0].id }],
      ],
      [
        'a new option without content',
        (o: OptionBody[]) => [{ id: o[0].id }, { id: o[1].id }, {}],
      ],
    ])('rejects %s with 400', async (_name, build) => {
      const created = await createQuestion(singleChoicePayload());
      await updateQuestion(
        created.id,
        { options: build(created.answerOptions) },
        400,
      );
    });

    it('MATCHING: option edits are re-validated against the stored configuration', async () => {
      const created = await createQuestion(matchingPayload());
      const options = created.answerOptions;

      // Dropping a pair's option without replacing the configuration → 400.
      await updateQuestion(
        created.id,
        {
          options: [
            { id: options[0].id },
            { id: options[1].id },
            { id: options[2].id },
          ],
        },
        400,
      );

      // Supplying a consistent new set + configuration succeeds.
      const body = await updateQuestion(created.id, {
        options: [{ id: options[0].id }, { id: options[1].id }],
        configuration: { pairs: [{ left: 0, right: 1 }] },
      });
      expect(body.configuration).toEqual({ pairs: [{ left: 0, right: 1 }] });
      expect(body.answerOptions as OptionBody[]).toHaveLength(2);
    });

    it('returns 404 for an unknown id and 400 for a malformed id', async () => {
      await updateQuestion(GHOST_ID, { title: 'X?' }, 404);

      await request(app.getHttpServer())
        .put(`${QUESTIONS_URL}/not-a-uuid`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'X?' })
        .expect(400);
    });
  });

  describe('PATCH /admin/questions/{id}/publish', () => {
    it('publishes and unpublishes; the list reflects it', async () => {
      const created = await createQuestion(singleChoicePayload());

      const published = await publishQuestion(created.id, {
        isPublished: true,
      });
      expect(published.isPublished).toBe(true);

      const listed = await listQuestions('?isPublished=true&pageSize=100');
      expect(listed.items.some((q) => q.id === created.id)).toBe(true);

      const unpublished = await publishQuestion(created.id, {
        isPublished: false,
      });
      expect(unpublished.isPublished).toBe(false);
    });

    it('validates the body and the id', async () => {
      const created = await createQuestion(singleChoicePayload());

      await publishQuestion(created.id, {}, 400);
      await publishQuestion(created.id, { isPublished: 'yes' }, 400);
      await publishQuestion(GHOST_ID, { isPublished: true }, 404);
    });
  });

  describe('PUT /admin/questions/{id} with locale', () => {
    it('creates translations for title and options, then merge-updates them', async () => {
      const created = await createQuestion(singleChoicePayload());
      const [first, second] = created.answerOptions;

      const createdTranslation = await updateQuestion(created.id, {
        locale: Language.UKRAINIAN,
        title: 'Питання?',
        options: [
          { id: first.id, content: 'Правильно' },
          { id: second.id, content: 'Неправильно' },
        ],
      });
      expect(createdTranslation).toEqual({
        locale: Language.UKRAINIAN,
        title: 'Питання?',
        options: [
          { id: first.id, content: 'Правильно' },
          { id: second.id, content: 'Неправильно' },
        ],
      });

      // Updating one option's translation keeps the stored title.
      const updatedTranslation = await updateQuestion(created.id, {
        locale: Language.UKRAINIAN,
        options: [{ id: first.id, content: 'Точно правильно' }],
      });
      expect(updatedTranslation).toEqual({
        locale: Language.UKRAINIAN,
        title: 'Питання?',
        options: [{ id: first.id, content: 'Точно правильно' }],
      });

      const titleRow = await prisma.questionTranslation.findUnique({
        where: {
          questionId_locale: {
            questionId: created.id,
            locale: Language.UKRAINIAN,
          },
        },
      });
      expect(titleRow?.title).toBe('Питання?');

      const optionRow = await prisma.answerOptionTranslation.findUnique({
        where: {
          answerOptionId_locale: {
            answerOptionId: first.id,
            locale: Language.UKRAINIAN,
          },
        },
      });
      expect(optionRow?.content).toBe('Точно правильно');

      // The default-locale record is untouched.
      const list = await listQuestions(
        `?search=${encodeURIComponent('single choice')}&pageSize=100`,
      );
      const original = list.items.find((q) => q.id === created.id);
      expect(original?.title).toBe(created.title);
    });

    it('requires title when the translation does not exist yet', async () => {
      const created = await createQuestion(singleChoicePayload());

      await updateQuestion(
        created.id,
        {
          locale: Language.UKRAINIAN,
          options: [{ id: created.answerOptions[0].id, content: 'X' }],
        },
        400,
      );
    });

    it('rejects the default locale and non-localizable fields', async () => {
      const created = await createQuestion(singleChoicePayload());

      await updateQuestion(
        created.id,
        { locale: Language.ENGLISH, title: 'English?' },
        400,
      );
      await updateQuestion(
        created.id,
        { locale: Language.UKRAINIAN, title: 'X?', imageUrl: 'https://x.png' },
        400,
      );
      await updateQuestion(
        created.id,
        {
          locale: Language.UKRAINIAN,
          title: 'X?',
          configuration: { pairs: [] },
        },
        400,
      );
    });

    it('rejects localized options with extra fields or foreign ids', async () => {
      const created = await createQuestion(singleChoicePayload());
      const other = await createQuestion(singleChoicePayload());

      await updateQuestion(
        created.id,
        {
          locale: Language.UKRAINIAN,
          title: 'X?',
          options: [
            { id: created.answerOptions[0].id, content: 'X', order: 1 },
          ],
        },
        400,
      );
      await updateQuestion(
        created.id,
        {
          locale: Language.UKRAINIAN,
          title: 'X?',
          options: [{ id: other.answerOptions[0].id, content: 'X' }],
        },
        400,
      );
    });

    it('returns 404 for an unknown question', async () => {
      await updateQuestion(
        GHOST_ID,
        { locale: Language.UKRAINIAN, title: 'X?' },
        404,
      );
    });
  });

  describe('DELETE /admin/questions/{id}', () => {
    it('soft deletes: 204, hidden from listings, row retained', async () => {
      const created = await createQuestion(singleChoicePayload());

      await deleteQuestion(created.id);

      const list = await listQuestions(`?topicId=${topicId}&pageSize=100`);
      expect(list.items.some((q) => q.id === created.id)).toBe(false);

      const row = await prisma.question.findUnique({
        where: { id: created.id },
      });
      expect(row).not.toBeNull();
      expect(row!.deletedAt).not.toBeNull();
    });

    it('returns 404 on repeat delete, update, and publish of a deleted question', async () => {
      const created = await createQuestion(singleChoicePayload());

      await deleteQuestion(created.id);
      await deleteQuestion(created.id, 404);
      await updateQuestion(created.id, { title: 'Ghost?' }, 404);
      await publishQuestion(created.id, { isPublished: true }, 404);
    });
  });
});
