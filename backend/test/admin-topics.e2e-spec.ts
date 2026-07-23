import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AccountStatus, Language, UserRole } from '@prisma/client';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

interface TopicBody {
  id: string;
  subjectId: string;
  name: string;
  slug: string;
  description: string | null;
  isPublished: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface PageBody {
  items: TopicBody[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

const GHOST_ID = '00000000-0000-0000-0000-000000000000';

/**
 * Admin Topics CRUD end-to-end tests (docs/04-api/admin.md §5).
 */
describe('Admin Topics (e2e)', () => {
  const EMAIL_PREFIX = 'phase42-topic';
  const USERNAME_PREFIX = 'phase42topic';
  const SLUG_PREFIX = 'p42';
  const PASSWORD = 'ValidPass1!';
  const REGISTER_URL = '/api/v1/auth/register';
  const LOGIN_URL = '/api/v1/auth/login';
  const SUBJECTS_URL = '/api/v1/admin/subjects';
  const TOPICS_URL = '/api/v1/admin/topics';

  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let userToken: string;
  let subjectA: string;
  let subjectB: string;
  let counter = 0;

  const uniqueTopic = (): { name: string; slug: string } => {
    counter += 1;
    return {
      name: `Phase42 Topic ${counter}`,
      slug: `${SLUG_PREFIX}-topic-${counter}`,
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

  const createParentSubject = async (label: string): Promise<string> => {
    const response = await request(app.getHttpServer())
      .post(SUBJECTS_URL)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `Phase42 Subject ${label}`,
        slug: `${SLUG_PREFIX}-subject-${label}`,
      })
      .expect(201);
    return (response.body as { id: string }).id;
  };

  const createTopic = async (
    payload: Record<string, unknown>,
    expectedStatus = 201,
  ): Promise<TopicBody> => {
    const response = await request(app.getHttpServer())
      .post(TOPICS_URL)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(payload)
      .expect(expectedStatus);
    return response.body as TopicBody;
  };

  const updateTopic = async (
    id: string,
    payload: Record<string, unknown>,
    expectedStatus = 200,
  ): Promise<Record<string, unknown>> => {
    const response = await request(app.getHttpServer())
      .put(`${TOPICS_URL}/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(payload)
      .expect(expectedStatus);
    return response.body as Record<string, unknown>;
  };

  const deleteTopic = async (
    id: string,
    expectedStatus = 204,
  ): Promise<void> => {
    await request(app.getHttpServer())
      .delete(`${TOPICS_URL}/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(expectedStatus);
  };

  const listTopics = async (query = ''): Promise<PageBody> => {
    const response = await request(app.getHttpServer())
      .get(`${TOPICS_URL}${query}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    return response.body as PageBody;
  };

  const removeTestData = async (): Promise<void> => {
    // Hard cleanup of fixtures only — translations cascade with their rows.
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
    subjectA = await createParentSubject('a');
    subjectB = await createParentSubject('b');
  });

  afterAll(async () => {
    await removeTestData();
    await app.close();
  });

  describe('route protection', () => {
    it.each([
      ['GET list', 'get', TOPICS_URL],
      ['POST create', 'post', TOPICS_URL],
      ['PUT update', 'put', `${TOPICS_URL}/${GHOST_ID}`],
      ['DELETE remove', 'delete', `${TOPICS_URL}/${GHOST_ID}`],
    ] as const)(
      '%s rejects a missing token with 401',
      async (_name, method, url) => {
        await request(app.getHttpServer())[method](url).expect(401);
      },
    );

    it.each([
      ['GET list', 'get', TOPICS_URL],
      ['POST create', 'post', TOPICS_URL],
      ['PUT update', 'put', `${TOPICS_URL}/${GHOST_ID}`],
      ['DELETE remove', 'delete', `${TOPICS_URL}/${GHOST_ID}`],
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

  describe('POST /admin/topics', () => {
    it('creates a topic with all fields and returns it', async () => {
      const base = uniqueTopic();
      const body = await createTopic({
        subjectId: subjectA,
        ...base,
        description: 'A topic',
        displayOrder: 500,
      });

      expect(body).toMatchObject({
        subjectId: subjectA,
        ...base,
        description: 'A topic',
        isPublished: false,
        displayOrder: 500,
      });
      expect(body.id).toBeDefined();
      expect(body).not.toHaveProperty('deletedAt');
    });

    it('returns 404 for an unknown parent subject', async () => {
      const body = await createTopic(
        { subjectId: GHOST_ID, ...uniqueTopic() },
        404,
      );
      expect(body).toMatchObject({
        statusCode: 404,
        message: 'Subject not found.',
      });
    });

    it('returns 404 for a soft-deleted parent subject', async () => {
      const doomed = await createParentSubject('doomed');
      await request(app.getHttpServer())
        .delete(`${SUBJECTS_URL}/${doomed}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);

      await createTopic({ subjectId: doomed, ...uniqueTopic() }, 404);
    });

    it('rejects isPublished and locale at creation', async () => {
      await createTopic(
        { subjectId: subjectA, ...uniqueTopic(), isPublished: true },
        400,
      );
      await createTopic(
        { subjectId: subjectA, ...uniqueTopic(), locale: Language.UKRAINIAN },
        400,
      );
    });

    it('auto-assigns displayOrder = max + 1 within the subject only', async () => {
      const inA = await createTopic({
        subjectId: subjectA,
        ...uniqueTopic(),
        displayOrder: 900,
      });
      const nextInA = await createTopic({
        subjectId: subjectA,
        ...uniqueTopic(),
      });
      const firstInB = await createTopic({
        subjectId: subjectB,
        ...uniqueTopic(),
      });

      expect(nextInA.displayOrder).toBe(inA.displayOrder + 1);
      // Subject B is unaffected by subject A's high displayOrder.
      expect(firstInB.displayOrder).toBeLessThan(900);
    });

    it('returns 409 for duplicate name, slug, and displayOrder within one subject', async () => {
      const base = uniqueTopic();
      const created = await createTopic({ subjectId: subjectA, ...base });

      const other = uniqueTopic();
      const nameConflict = await createTopic(
        { subjectId: subjectA, name: base.name, slug: other.slug },
        409,
      );
      expect(nameConflict).toMatchObject({
        statusCode: 409,
        message: 'A topic with this name already exists in this subject.',
      });

      await createTopic(
        { subjectId: subjectA, name: other.name, slug: base.slug },
        409,
      );
      await createTopic(
        {
          subjectId: subjectA,
          ...uniqueTopic(),
          displayOrder: created.displayOrder,
        },
        409,
      );
    });

    it('allows identical name and slug in a different subject', async () => {
      const base = uniqueTopic();
      await createTopic({ subjectId: subjectA, ...base });

      const body = await createTopic({ subjectId: subjectB, ...base });
      expect(body.subjectId).toBe(subjectB);
    });

    // 'PARENT' is replaced with the real subject id at run time — it cannot
    // be referenced here because it is created in beforeAll.
    it.each([
      ['missing subjectId', { name: 'P42 X', slug: 'p42-x-valid' }],
      [
        'non-uuid subjectId',
        { subjectId: 'abc', name: 'P42 X', slug: 'p42-x-valid' },
      ],
      ['missing name', { subjectId: 'PARENT', slug: 'p42-x-valid' }],
      [
        'name too long',
        { subjectId: 'PARENT', name: 'a'.repeat(101), slug: 'p42-x-valid' },
      ],
      [
        'uppercase slug',
        { subjectId: 'PARENT', name: 'P42 X', slug: 'P42-Bad' },
      ],
      [
        'negative displayOrder',
        {
          subjectId: 'PARENT',
          name: 'P42 X',
          slug: 'p42-x-valid',
          displayOrder: -1,
        },
      ],
      [
        'description too long',
        {
          subjectId: 'PARENT',
          name: 'P42 X',
          slug: 'p42-x-valid',
          description: 'a'.repeat(501),
        },
      ],
      [
        'unknown field',
        {
          subjectId: 'PARENT',
          name: 'P42 X',
          slug: 'p42-x-valid',
          extra: true,
        },
      ],
    ])('rejects %s with 400', async (_name, payload) => {
      const resolved =
        payload.subjectId === 'PARENT'
          ? { ...payload, subjectId: subjectA }
          : payload;
      await createTopic(resolved, 400);
    });
  });

  describe('GET /admin/topics', () => {
    it('returns the pagination envelope with defaults', async () => {
      await createTopic({ subjectId: subjectA, ...uniqueTopic() });

      const body = await listTopics();

      expect(body.page).toBe(1);
      expect(body.pageSize).toBe(20);
      expect(body.totalPages).toBe(Math.ceil(body.totalItems / 20));
      expect(body.totalItems).toBeGreaterThan(0);
    });

    it('filters by subjectId', async () => {
      const inB = await createTopic({ subjectId: subjectB, ...uniqueTopic() });

      const body = await listTopics(`?subjectId=${subjectB}&pageSize=100`);

      expect(body.items.some((t) => t.id === inB.id)).toBe(true);
      expect(body.items.every((t) => t.subjectId === subjectB)).toBe(true);
    });

    it('includes unpublished topics and filters by isPublished', async () => {
      const created = await createTopic({
        subjectId: subjectA,
        ...uniqueTopic(),
      });
      await updateTopic(created.id, { isPublished: true });

      const published = await listTopics('?isPublished=true&pageSize=100');
      const unpublished = await listTopics('?isPublished=false&pageSize=100');

      expect(published.items.some((t) => t.id === created.id)).toBe(true);
      expect(unpublished.items.some((t) => t.id === created.id)).toBe(false);
    });

    it('searches name and slug case-insensitively', async () => {
      const created = await createTopic({
        subjectId: subjectA,
        name: 'Phase42 Searchable Algebra',
        slug: `${SLUG_PREFIX}-searchable-algebra`,
      });

      const byName = await listTopics('?search=SEARCHABLE%20ALG');
      const bySlug = await listTopics('?search=searchable-algebra');

      expect(byName.items.some((t) => t.id === created.id)).toBe(true);
      expect(bySlug.items.some((t) => t.id === created.id)).toBe(true);
    });

    it('sorts by displayOrder ascending by default and honors sort overrides', async () => {
      const defaults = await listTopics(`?subjectId=${subjectA}&pageSize=100`);
      const orders = defaults.items.map((t) => t.displayOrder);
      expect(orders).toEqual([...orders].sort((a, b) => a - b));

      const byNameDesc = await listTopics(
        '?sortBy=name&sortOrder=desc&pageSize=100',
      );
      const names = byNameDesc.items.map((t) => t.name);
      expect(names).toEqual([...names].sort().reverse());
    });

    it.each([
      ['page=0', '?page=0'],
      ['pageSize>100', '?pageSize=101'],
      ['non-uuid subjectId', '?subjectId=abc'],
      ['bad sortBy', '?sortBy=slug'],
      ['bad isPublished', '?isPublished=yes'],
      ['unknown param', '?foo=bar'],
    ])('rejects %s with 400', async (_name, query) => {
      await request(app.getHttpServer())
        .get(`${TOPICS_URL}${query}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });
  });

  describe('PUT /admin/topics/{id}', () => {
    it('merges: only supplied fields change; null clears description', async () => {
      const created = await createTopic({
        subjectId: subjectA,
        ...uniqueTopic(),
        description: 'Original',
      });

      const renamed = await updateTopic(created.id, {
        name: `${created.name} v2`,
      });
      expect(renamed).toMatchObject({
        name: `${created.name} v2`,
        slug: created.slug,
        subjectId: subjectA,
        description: 'Original',
        displayOrder: created.displayOrder,
      });

      const cleared = await updateTopic(created.id, { description: null });
      expect(cleared.description).toBeNull();
    });

    it('publishes and unpublishes', async () => {
      const created = await createTopic({
        subjectId: subjectA,
        ...uniqueTopic(),
      });

      const published = await updateTopic(created.id, { isPublished: true });
      expect(published.isPublished).toBe(true);

      const unpublished = await updateTopic(created.id, { isPublished: false });
      expect(unpublished.isPublished).toBe(false);
    });

    it('rejects subjectId — topics cannot move between subjects', async () => {
      const created = await createTopic({
        subjectId: subjectA,
        ...uniqueTopic(),
      });

      await updateTopic(created.id, { subjectId: subjectB }, 400);
    });

    it('rejects null for non-nullable fields', async () => {
      const created = await createTopic({
        subjectId: subjectA,
        ...uniqueTopic(),
      });

      await updateTopic(created.id, { name: null }, 400);
      await updateTopic(created.id, { slug: null }, 400);
      await updateTopic(created.id, { isPublished: null }, 400);
      await updateTopic(created.id, { displayOrder: null }, 400);
    });

    it('allows re-submitting the topic’s own unique values', async () => {
      const created = await createTopic({
        subjectId: subjectA,
        ...uniqueTopic(),
      });

      await updateTopic(created.id, {
        name: created.name,
        slug: created.slug,
        displayOrder: created.displayOrder,
      });
    });

    it('returns 409 when taking a sibling’s name, slug, or displayOrder', async () => {
      const first = await createTopic({
        subjectId: subjectA,
        ...uniqueTopic(),
      });
      const second = await createTopic({
        subjectId: subjectA,
        ...uniqueTopic(),
      });

      await updateTopic(second.id, { name: first.name }, 409);
      await updateTopic(second.id, { slug: first.slug }, 409);
      await updateTopic(second.id, { displayOrder: first.displayOrder }, 409);
    });

    it('allows taking values used in another subject', async () => {
      const inB = await createTopic({ subjectId: subjectB, ...uniqueTopic() });
      const inA = await createTopic({ subjectId: subjectA, ...uniqueTopic() });

      const body = await updateTopic(inA.id, {
        name: inB.name,
        slug: inB.slug,
      });
      expect(body).toMatchObject({ name: inB.name, slug: inB.slug });
    });

    it('returns 404 for an unknown id and 400 for a malformed id', async () => {
      await updateTopic(GHOST_ID, { name: 'X' }, 404);

      await request(app.getHttpServer())
        .put(`${TOPICS_URL}/not-a-uuid`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'X' })
        .expect(400);
    });
  });

  describe('PUT /admin/topics/{id} with locale', () => {
    it('creates a translation, then merge-updates it', async () => {
      const created = await createTopic({
        subjectId: subjectA,
        ...uniqueTopic(),
      });

      const createdTranslation = await updateTopic(created.id, {
        locale: Language.UKRAINIAN,
        name: 'Алгебра',
        description: 'Опис',
      });
      expect(createdTranslation).toEqual({
        locale: Language.UKRAINIAN,
        name: 'Алгебра',
        description: 'Опис',
      });

      const updatedTranslation = await updateTopic(created.id, {
        locale: Language.UKRAINIAN,
        description: 'Новий опис',
      });
      expect(updatedTranslation).toEqual({
        locale: Language.UKRAINIAN,
        name: 'Алгебра',
        description: 'Новий опис',
      });

      const row = await prisma.topicTranslation.findUnique({
        where: {
          topicId_locale: { topicId: created.id, locale: Language.UKRAINIAN },
        },
      });
      expect(row).toMatchObject({ name: 'Алгебра', description: 'Новий опис' });

      // The default-locale record is untouched.
      const list = await listTopics(`?subjectId=${subjectA}&pageSize=100`);
      expect(list.items.find((t) => t.id === created.id)?.name).toBe(
        created.name,
      );
    });

    it('requires name when the translation does not exist yet', async () => {
      const created = await createTopic({
        subjectId: subjectA,
        ...uniqueTopic(),
      });

      await updateTopic(
        created.id,
        { locale: Language.UKRAINIAN, description: 'Тільки опис' },
        400,
      );
    });

    it('rejects the default locale', async () => {
      const created = await createTopic({
        subjectId: subjectA,
        ...uniqueTopic(),
      });

      await updateTopic(
        created.id,
        { locale: Language.ENGLISH, name: 'English name' },
        400,
      );
    });

    it('rejects non-localizable fields alongside locale', async () => {
      const created = await createTopic({
        subjectId: subjectA,
        ...uniqueTopic(),
      });

      await updateTopic(
        created.id,
        { locale: Language.UKRAINIAN, name: 'Імʼя', slug: 'p42-nope' },
        400,
      );
      await updateTopic(
        created.id,
        { locale: Language.UKRAINIAN, name: 'Імʼя', isPublished: true },
        400,
      );
    });

    it('returns 404 for an unknown topic', async () => {
      await updateTopic(
        GHOST_ID,
        { locale: Language.UKRAINIAN, name: 'X' },
        404,
      );
    });
  });

  describe('DELETE /admin/topics/{id}', () => {
    it('soft deletes: 204, hidden from listings, row retained', async () => {
      const created = await createTopic({
        subjectId: subjectA,
        ...uniqueTopic(),
      });

      await deleteTopic(created.id);

      const list = await listTopics(`?subjectId=${subjectA}&pageSize=100`);
      expect(list.items.some((t) => t.id === created.id)).toBe(false);

      const row = await prisma.topic.findUnique({ where: { id: created.id } });
      expect(row).not.toBeNull();
      expect(row!.deletedAt).not.toBeNull();
    });

    it('returns 404 on repeat delete and on updating a deleted topic', async () => {
      const created = await createTopic({
        subjectId: subjectA,
        ...uniqueTopic(),
      });

      await deleteTopic(created.id);
      await deleteTopic(created.id, 404);
      await updateTopic(created.id, { name: 'Ghost' }, 404);
    });

    it('keeps name and slug reserved within the subject after deletion', async () => {
      const base = uniqueTopic();
      const created = await createTopic({ subjectId: subjectA, ...base });
      await deleteTopic(created.id);

      const other = uniqueTopic();
      await createTopic(
        { subjectId: subjectA, name: base.name, slug: other.slug },
        409,
      );
      await createTopic(
        { subjectId: subjectA, name: other.name, slug: base.slug },
        409,
      );

      // The reservation is scoped: subject B may use both.
      await createTopic({ subjectId: subjectB, ...base });
    });

    it('frees the displayOrder within the subject after deletion', async () => {
      const created = await createTopic({
        subjectId: subjectA,
        ...uniqueTopic(),
        displayOrder: 5000,
      });

      await deleteTopic(created.id);

      const replacement = await createTopic({
        subjectId: subjectA,
        ...uniqueTopic(),
        displayOrder: 5000,
      });
      expect(replacement.displayOrder).toBe(5000);
    });
  });
});
