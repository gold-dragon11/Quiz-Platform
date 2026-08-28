import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AccountStatus, UserRole } from '@prisma/client';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

interface MaterialBody {
  id: string;
  subjectId: string;
  topicId: string | null;
  title: string;
  slug: string;
  description: string | null;
  content: string;
  estimatedReadingTime: number | null;
  isPublished: boolean;
  displayOrder: number;
}

interface PublicMaterialBody {
  id: string;
  subjectId: string;
  topicId: string | null;
  title: string;
  slug: string;
  description: string | null;
  content: string;
  estimatedReadingTime: number | null;
}

interface MaterialSummaryBody {
  id: string;
  topicId: string | null;
  title: string;
  slug: string;
  description: string | null;
  estimatedReadingTime: number | null;
}

const GHOST_ID = '00000000-0000-0000-0000-000000000000';

/**
 * Learning materials end-to-end tests (docs/04-api/learning-materials.md).
 *
 * The behaviour worth guarding is visibility: a learner must not reach a
 * material whose own row, topic, or subject is unpublished or deleted, and
 * every such case must be indistinguishable from "there is none".
 */
describe('Learning Materials (e2e)', () => {
  const EMAIL_PREFIX = 'lm-e2e';
  const USERNAME_PREFIX = 'lme2e';
  const SLUG_PREFIX = 'lm-e2e';
  const PASSWORD = 'ValidPass1!';

  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let userToken: string;
  let counter = 0;

  let subjPub: string;
  let subjUnpub: string;
  let tPub: string; // published topic under the published subject
  let tSecond: string; // second published topic, no material
  let tUnpub: string; // unpublished topic under the published subject
  let tUnderUnpub: string; // published topic under the unpublished subject
  let publishedMaterialId: string;

  const authed = (method: 'get', url: string, token: string): request.Test =>
    request(app.getHttpServer())
      [method](url)
      .set('Authorization', `Bearer ${token}`);

  const admin = async (
    method: 'post' | 'put' | 'delete',
    url: string,
    payload?: Record<string, unknown>,
    expectedStatus?: number,
  ): Promise<Record<string, unknown>> => {
    let call = request(app.getHttpServer())
      [method](url)
      .set('Authorization', `Bearer ${adminToken}`);
    if (payload) {
      call = call.send(payload);
    }
    const response = expectedStatus
      ? await call.expect(expectedStatus)
      : await call;
    return response.body as Record<string, unknown>;
  };

  const registerAccount = async (role: UserRole): Promise<string> => {
    counter += 1;
    const email = `${EMAIL_PREFIX}-${counter}@example.com`;
    const username = `${USERNAME_PREFIX}${counter}`;

    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, username, password: PASSWORD })
      .expect(201);
    await prisma.user.update({
      where: { email },
      data: { accountStatus: AccountStatus.ACTIVE, role },
    });

    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: PASSWORD })
      .expect(200);
    return (response.body as { accessToken: string }).accessToken;
  };

  const createSubject = async (
    label: string,
    displayOrder: number,
    publish: boolean,
  ): Promise<string> => {
    const body = await admin(
      'post',
      '/api/v1/admin/subjects',
      {
        name: `LM Subject ${label}`,
        slug: `${SLUG_PREFIX}-subject-${label}`,
        displayOrder,
      },
      201,
    );
    const id = (body as { id: string }).id;
    if (publish) {
      await admin(
        'put',
        `/api/v1/admin/subjects/${id}`,
        { isPublished: true },
        200,
      );
    }
    return id;
  };

  const createTopic = async (
    subjectId: string,
    label: string,
    displayOrder: number,
    publish: boolean,
  ): Promise<string> => {
    const body = await admin(
      'post',
      '/api/v1/admin/topics',
      {
        subjectId,
        name: `LM Topic ${label}`,
        slug: `${SLUG_PREFIX}-topic-${label}`,
        displayOrder,
      },
      201,
    );
    const id = (body as { id: string }).id;
    if (publish) {
      await admin(
        'put',
        `/api/v1/admin/topics/${id}`,
        { isPublished: true },
        200,
      );
    }
    return id;
  };

  const createMaterial = async (
    payload: Record<string, unknown>,
  ): Promise<MaterialBody> =>
    (await admin(
      'post',
      '/api/v1/admin/learning-materials',
      payload,
      201,
    )) as unknown as MaterialBody;

  const removeTestData = async (): Promise<void> => {
    await prisma.learningMaterial.deleteMany({
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

    subjPub = await createSubject('pub', 9101, true);
    subjUnpub = await createSubject('unpub', 9102, false);

    tPub = await createTopic(subjPub, 'pub', 1, true);
    tSecond = await createTopic(subjPub, 'second', 2, true);
    tUnpub = await createTopic(subjPub, 'unpub', 3, false);
    tUnderUnpub = await createTopic(subjUnpub, 'hidden', 1, true);

    const published = await createMaterial({
      subjectId: subjPub,
      topicId: tPub,
      title: 'Квадратична функція',
      slug: `${SLUG_PREFIX}-published`,
      description: 'Парабола та її властивості.',
      content: '## Означення\n\nФункція $y = ax^2 + bx + c$, де $a \\ne 0$.',
    });
    publishedMaterialId = published.id;
    await admin(
      'put',
      `/api/v1/admin/learning-materials/${publishedMaterialId}`,
      { isPublished: true },
      200,
    );

    // Draft under a published topic — must stay invisible to learners.
    await createMaterial({
      subjectId: subjPub,
      topicId: tSecond,
      title: 'Чернетка',
      slug: `${SLUG_PREFIX}-draft`,
      content: 'Ще не готово.',
    });

    // Published material, but its topic is not.
    const underUnpubTopic = await createMaterial({
      subjectId: subjPub,
      topicId: tUnpub,
      title: 'Під неопублікованою темою',
      slug: `${SLUG_PREFIX}-under-unpub-topic`,
      content: 'Текст.',
    });
    await admin(
      'put',
      `/api/v1/admin/learning-materials/${underUnpubTopic.id}`,
      { isPublished: true },
      200,
    );

    // Published material under a published topic of an unpublished subject.
    const underUnpubSubject = await createMaterial({
      subjectId: subjUnpub,
      topicId: tUnderUnpub,
      title: 'Під неопублікованим предметом',
      slug: `${SLUG_PREFIX}-under-unpub-subject`,
      content: 'Текст.',
    });
    await admin(
      'put',
      `/api/v1/admin/learning-materials/${underUnpubSubject.id}`,
      { isPublished: true },
      200,
    );
  });

  afterAll(async () => {
    await removeTestData();
    await app.close();
  });

  describe('GET /topics/:topicId/material', () => {
    it('requires authentication', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/topics/${tPub}/material`)
        .expect(401);
    });

    it('returns the published material with its Markdown body', async () => {
      const response = await authed(
        'get',
        `/api/v1/topics/${tPub}/material`,
        userToken,
      ).expect(200);

      const body = response.body as PublicMaterialBody;
      expect(body.title).toBe('Квадратична функція');
      expect(body.content).toContain('$y = ax^2 + bx + c$');
      expect(body.subjectId).toBe(subjPub);
      expect(body.topicId).toBe(tPub);
      // Derived from the word count, never authored.
      expect(body.estimatedReadingTime).toBeGreaterThanOrEqual(1);
      // Nothing administrative leaks into the public shape.
      expect(body).not.toHaveProperty('isPublished');
      expect(body).not.toHaveProperty('displayOrder');
    });

    it.each([
      ['a topic whose material is still a draft', (): string => tSecond],
      ['an unpublished topic', (): string => tUnpub],
      ['a topic under an unpublished subject', (): string => tUnderUnpub],
      ['an unknown topic', (): string => GHOST_ID],
    ])('answers 404 for %s', async (_label, topicId) => {
      await authed(
        'get',
        `/api/v1/topics/${topicId()}/material`,
        userToken,
      ).expect(404);
    });

    it('answers 404 once the material is soft-deleted', async () => {
      const doomed = await createMaterial({
        subjectId: subjPub,
        topicId: tSecond,
        title: 'Тимчасовий',
        slug: `${SLUG_PREFIX}-doomed`,
        content: 'Текст.',
        displayOrder: 50,
      });
      await admin(
        'put',
        `/api/v1/admin/learning-materials/${doomed.id}`,
        { isPublished: true },
        200,
      );
      await authed(
        'get',
        `/api/v1/topics/${tSecond}/material`,
        userToken,
      ).expect(200);

      await admin(
        'delete',
        `/api/v1/admin/learning-materials/${doomed.id}`,
        undefined,
        204,
      );
      await authed(
        'get',
        `/api/v1/topics/${tSecond}/material`,
        userToken,
      ).expect(404);
    });
  });

  describe('GET /subjects/:subjectId/materials', () => {
    it('lists only published materials, without their bodies', async () => {
      const response = await authed(
        'get',
        `/api/v1/subjects/${subjPub}/materials`,
        userToken,
      ).expect(200);

      const body = response.body as MaterialSummaryBody[];
      expect(body).toHaveLength(1);
      expect(body[0].topicId).toBe(tPub);
      expect(body[0]).not.toHaveProperty('content');
    });

    it('returns an empty list for an unpublished subject', async () => {
      const response = await authed(
        'get',
        `/api/v1/subjects/${subjUnpub}/materials`,
        userToken,
      ).expect(200);
      expect(response.body).toEqual([]);
    });

    it('returns an empty list for an unknown subject', async () => {
      const response = await authed(
        'get',
        `/api/v1/subjects/${GHOST_ID}/materials`,
        userToken,
      ).expect(200);
      expect(response.body).toEqual([]);
    });
  });

  describe('POST /admin/learning-materials', () => {
    it('rejects a non-administrator', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/admin/learning-materials')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          subjectId: subjPub,
          title: 'Ні',
          slug: `${SLUG_PREFIX}-forbidden`,
          content: 'Текст.',
        })
        .expect(403);
    });

    it('creates the material unpublished and derives the reading time', async () => {
      const body = await createMaterial({
        subjectId: subjPub,
        title: 'Без теми',
        slug: `${SLUG_PREFIX}-no-topic`,
        content: Array.from({ length: 300 }, () => 'слово').join(' '),
      });

      expect(body.isPublished).toBe(false);
      expect(body.topicId).toBeNull();
      // 300 words at 150 wpm.
      expect(body.estimatedReadingTime).toBe(2);
    });

    it('rejects a slug already used in the same subject', async () => {
      await admin(
        'post',
        '/api/v1/admin/learning-materials',
        {
          subjectId: subjPub,
          title: 'Дублікат',
          slug: `${SLUG_PREFIX}-published`,
          content: 'Текст.',
        },
        409,
      );
    });

    it('rejects a topic that belongs to another subject', async () => {
      await admin(
        'post',
        '/api/v1/admin/learning-materials',
        {
          subjectId: subjPub,
          topicId: tUnderUnpub,
          title: 'Чужа тема',
          slug: `${SLUG_PREFIX}-foreign-topic`,
          content: 'Текст.',
        },
        400,
      );
    });

    it('rejects raw HTML in the body', async () => {
      await admin(
        'post',
        '/api/v1/admin/learning-materials',
        {
          subjectId: subjPub,
          title: 'З теґом',
          slug: `${SLUG_PREFIX}-html`,
          content: 'Текст <script>alert(1)</script>.',
        },
        400,
      );
    });

    it('rejects a javascript: link', async () => {
      await admin(
        'post',
        '/api/v1/admin/learning-materials',
        {
          subjectId: subjPub,
          title: 'З посиланням',
          slug: `${SLUG_PREFIX}-js-link`,
          content: 'Ось [посилання](javascript:alert(1)).',
        },
        400,
      );
    });

    it('rejects an unknown subject', async () => {
      await admin(
        'post',
        '/api/v1/admin/learning-materials',
        {
          subjectId: GHOST_ID,
          title: 'Нікуди',
          slug: `${SLUG_PREFIX}-ghost-subject`,
          content: 'Текст.',
        },
        404,
      );
    });
  });

  describe('PUT /admin/learning-materials/:id', () => {
    it('recomputes the reading time when the content changes', async () => {
      const body = (await admin(
        'put',
        `/api/v1/admin/learning-materials/${publishedMaterialId}`,
        { content: Array.from({ length: 600 }, () => 'слово').join(' ') },
        200,
      )) as unknown as MaterialBody;

      expect(body.estimatedReadingTime).toBe(4);
    });

    it('rejects an attempt to move the material to another subject', async () => {
      await admin(
        'put',
        `/api/v1/admin/learning-materials/${publishedMaterialId}`,
        { subjectId: subjUnpub },
        400,
      );
    });

    it('rejects a hand-written reading time', async () => {
      await admin(
        'put',
        `/api/v1/admin/learning-materials/${publishedMaterialId}`,
        { estimatedReadingTime: 1 },
        400,
      );
    });

    it('answers 404 for an unknown material', async () => {
      await admin(
        'put',
        `/api/v1/admin/learning-materials/${GHOST_ID}`,
        { title: 'Нове' },
        404,
      );
    });
  });
});
