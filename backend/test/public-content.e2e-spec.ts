import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  AccountStatus,
  Language,
  QuestionType,
  UserRole,
} from '@prisma/client';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

interface PublicSubjectBody {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  color: string | null;
}

interface PublicTopicBody {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  displayOrder: number;
}

interface PublicOptionBody {
  id: string;
  content: string;
  imageUrl: string | null;
  order: number;
}

interface PublicQuestionBody {
  id: string;
  type: string;
  title: string;
  difficulty: string | null;
  imageUrl: string | null;
  answerOptions: PublicOptionBody[];
  configuration?: { pairs: { left: number; right: number }[] };
}

interface QuestionsPage {
  items: PublicQuestionBody[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

const GHOST_ID = '00000000-0000-0000-0000-000000000000';

/**
 * Public content API end-to-end tests — Phase 4.5
 * (docs/04-api/questions.md §4-§7, §12, §14).
 */
describe('Public Content (e2e)', () => {
  const EMAIL_PREFIX = 'phase45-pc';
  const USERNAME_PREFIX = 'phase45pc';
  const SLUG_PREFIX = 'p45';
  const PASSWORD = 'ValidPass1!';

  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let userToken: string;
  let counter = 0;

  // Fixture ids.
  let subjPub: string; // published, translated
  let subjPub2: string; // published, untranslated, higher displayOrder
  let subjUnpub: string; // never published
  let subjDeleted: string; // published then soft-deleted
  let tPub: string; // published topic under subjPub, translated
  let tPub2: string; // published topic under subjPub, higher order
  let tUnpub: string; // unpublished topic under subjPub
  let tDeleted: string; // published then deleted topic under subjPub
  let tUnderUnpub: string; // published topic under the unpublished subject
  let qSC: PublicQuestionBody & { answerOptions: { id: string }[] };
  let qMatch: { id: string };

  const authed = (method: 'get', url: string, token: string): request.Test =>
    request(app.getHttpServer())
      [method](url)
      .set('Authorization', `Bearer ${token}`);

  const admin = async (
    method: 'post' | 'put' | 'patch' | 'delete',
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
        name: `Phase45 Subject ${label}`,
        slug: `${SLUG_PREFIX}-subject-${label}`,
        description: `About ${label}`,
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
        name: `Phase45 Topic ${label}`,
        slug: `${SLUG_PREFIX}-topic-${label}`,
        description: `Topic about ${label}`,
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

  const removeTestData = async (): Promise<void> => {
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

    // Subjects.
    subjPub = await createSubject('pub', 8101, true);
    subjPub2 = await createSubject('pub2', 8102, true);
    subjUnpub = await createSubject('unpub', 8103, false);
    subjDeleted = await createSubject('doomed', 8104, true);
    await admin(
      'delete',
      `/api/v1/admin/subjects/${subjDeleted}`,
      undefined,
      204,
    );

    // Topics under the published subject.
    tPub = await createTopic(subjPub, 'pub', 1, true);
    tPub2 = await createTopic(subjPub, 'pub2', 2, true);
    tUnpub = await createTopic(subjPub, 'unpub', 3, false);
    tDeleted = await createTopic(subjPub, 'doomed', 4, true);
    await admin('delete', `/api/v1/admin/topics/${tDeleted}`, undefined, 204);
    tUnderUnpub = await createTopic(subjUnpub, 'orphan', 1, true);

    // Questions under tPub: published single choice (older), unpublished,
    // deleted, published matching (newest).
    qSC = (await admin(
      'post',
      '/api/v1/admin/questions',
      {
        topicId: tPub,
        type: QuestionType.SINGLE_CHOICE,
        title: 'Phase45 what is 2+2?',
        difficulty: 'BEGINNER',
        options: [{ content: 'Four', isCorrect: true }, { content: 'Five' }],
      },
      201,
    )) as unknown as typeof qSC;
    await admin(
      'patch',
      `/api/v1/admin/questions/${qSC.id}/publish`,
      { isPublished: true },
      200,
    );

    const qUnpub = (await admin(
      'post',
      '/api/v1/admin/questions',
      {
        topicId: tPub,
        type: QuestionType.SINGLE_CHOICE,
        title: 'Phase45 unpublished?',
        options: [{ content: 'A', isCorrect: true }, { content: 'B' }],
      },
      201,
    )) as { id: string };
    void qUnpub;

    const qDeleted = (await admin(
      'post',
      '/api/v1/admin/questions',
      {
        topicId: tPub,
        type: QuestionType.SINGLE_CHOICE,
        title: 'Phase45 deleted?',
        options: [{ content: 'A', isCorrect: true }, { content: 'B' }],
      },
      201,
    )) as { id: string };
    await admin(
      'patch',
      `/api/v1/admin/questions/${qDeleted.id}/publish`,
      { isPublished: true },
      200,
    );
    await admin(
      'delete',
      `/api/v1/admin/questions/${qDeleted.id}`,
      undefined,
      204,
    );

    qMatch = (await admin(
      'post',
      '/api/v1/admin/questions',
      {
        topicId: tPub,
        type: QuestionType.MATCHING,
        title: 'Phase45 match capitals?',
        options: [
          { content: 'Ukraine' },
          { content: 'Kyiv' },
          { content: 'France' },
          { content: 'Paris' },
        ],
        configuration: {
          pairs: [
            { left: 0, right: 1 },
            { left: 2, right: 3 },
          ],
        },
      },
      201,
    )) as { id: string };
    await admin(
      'patch',
      `/api/v1/admin/questions/${qMatch.id}/publish`,
      { isPublished: true },
      200,
    );

    // A published question under the unpublished topic (must stay hidden).
    const qUnderUnpubTopic = (await admin(
      'post',
      '/api/v1/admin/questions',
      {
        topicId: tUnpub,
        type: QuestionType.SINGLE_CHOICE,
        title: 'Phase45 hidden by topic?',
        options: [{ content: 'A', isCorrect: true }, { content: 'B' }],
      },
      201,
    )) as { id: string };
    await admin(
      'patch',
      `/api/v1/admin/questions/${qUnderUnpubTopic.id}/publish`,
      { isPublished: true },
      200,
    );

    // Translations.
    await admin(
      'put',
      `/api/v1/admin/subjects/${subjPub}`,
      { locale: Language.UKRAINIAN, name: 'Математика', description: 'Опис' },
      200,
    );
    await admin(
      'put',
      `/api/v1/admin/topics/${tPub}`,
      { locale: Language.UKRAINIAN, name: 'Алгебра' },
      200,
    );
    await admin(
      'put',
      `/api/v1/admin/questions/${qSC.id}`,
      {
        locale: Language.UKRAINIAN,
        title: 'Скільки буде 2+2?',
        options: [{ id: qSC.answerOptions[0].id, content: 'Чотири' }],
      },
      200,
    );
  });

  afterAll(async () => {
    await removeTestData();
    await app.close();
  });

  const myPublicSubjects = (items: PublicSubjectBody[]): PublicSubjectBody[] =>
    items.filter((s) => s.slug.startsWith(SLUG_PREFIX));

  describe('authentication', () => {
    it.each([
      ['subjects', '/api/v1/subjects'],
      ['topics', `/api/v1/subjects/${GHOST_ID}/topics`],
      ['questions', `/api/v1/topics/${GHOST_ID}/questions`],
    ])('%s rejects a missing token with 401', async (_name, url) => {
      await request(app.getHttpServer()).get(url).expect(401);
    });
  });

  describe('GET /subjects', () => {
    it('lists only published, non-deleted subjects in display order with the exact field set', async () => {
      const response = await authed(
        'get',
        '/api/v1/subjects',
        userToken,
      ).expect(200);
      const items = myPublicSubjects(response.body as PublicSubjectBody[]);

      expect(items.map((s) => s.id)).toEqual([subjPub, subjPub2]);
      expect(items.map((s) => s.id)).not.toContain(subjUnpub);
      expect(items.map((s) => s.id)).not.toContain(subjDeleted);

      for (const subject of items) {
        expect(Object.keys(subject).sort()).toEqual([
          'color',
          'description',
          'icon',
          'id',
          'name',
          'slug',
        ]);
      }
    });

    it('translates name and description for a supported locale, with per-record fallback', async () => {
      const response = await authed(
        'get',
        '/api/v1/subjects?locale=UKRAINIAN',
        userToken,
      ).expect(200);
      const items = myPublicSubjects(response.body as PublicSubjectBody[]);

      const translated = items.find((s) => s.id === subjPub);
      const untranslated = items.find((s) => s.id === subjPub2);
      expect(translated?.name).toBe('Математика');
      expect(translated?.description).toBe('Опис');
      expect(untranslated?.name).toBe('Phase45 Subject pub2');
    });

    it('treats locale case-insensitively and falls back on unsupported values', async () => {
      const lower = await authed(
        'get',
        '/api/v1/subjects?locale=ukrainian',
        userToken,
      ).expect(200);
      expect(
        myPublicSubjects(lower.body as PublicSubjectBody[]).find(
          (s) => s.id === subjPub,
        )?.name,
      ).toBe('Математика');

      const unsupported = await authed(
        'get',
        '/api/v1/subjects?locale=KLINGON',
        userToken,
      ).expect(200);
      expect(
        myPublicSubjects(unsupported.body as PublicSubjectBody[]).find(
          (s) => s.id === subjPub,
        )?.name,
      ).toBe('Phase45 Subject pub');
    });

    it('defaults to the user’s stored language when locale is omitted', async () => {
      const email = `${EMAIL_PREFIX}-uk-${(counter += 1)}@example.com`;
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email,
          username: `${USERNAME_PREFIX}uk${counter}`,
          password: PASSWORD,
        })
        .expect(201);
      const ukUser = await prisma.user.update({
        where: { email },
        data: { accountStatus: AccountStatus.ACTIVE },
        select: { id: true },
      });
      await prisma.userSettings.update({
        where: { userId: ukUser.id },
        data: { language: Language.UKRAINIAN },
      });
      const login = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password: PASSWORD })
        .expect(200);
      const ukToken = (login.body as { accessToken: string }).accessToken;

      const response = await authed('get', '/api/v1/subjects', ukToken).expect(
        200,
      );
      expect(
        myPublicSubjects(response.body as PublicSubjectBody[]).find(
          (s) => s.id === subjPub,
        )?.name,
      ).toBe('Математика');
    });

    it('rejects unknown query parameters with 400', async () => {
      await authed('get', '/api/v1/subjects?foo=bar', userToken).expect(400);
    });
  });

  describe('GET /subjects/{subjectId}/topics', () => {
    it('lists only published, non-deleted topics in display order with the exact field set', async () => {
      const response = await authed(
        'get',
        `/api/v1/subjects/${subjPub}/topics`,
        userToken,
      ).expect(200);
      const items = response.body as PublicTopicBody[];

      expect(items.map((t) => t.id)).toEqual([tPub, tPub2]);
      for (const topic of items) {
        expect(Object.keys(topic).sort()).toEqual([
          'description',
          'displayOrder',
          'id',
          'name',
          'slug',
        ]);
      }
    });

    it('translates and falls back per record', async () => {
      const response = await authed(
        'get',
        `/api/v1/subjects/${subjPub}/topics?locale=UKRAINIAN`,
        userToken,
      ).expect(200);
      const items = response.body as PublicTopicBody[];

      expect(items.find((t) => t.id === tPub)?.name).toBe('Алгебра');
      // Untranslated topic falls back; untranslated description too.
      expect(items.find((t) => t.id === tPub2)?.name).toBe(
        'Phase45 Topic pub2',
      );
      expect(items.find((t) => t.id === tPub)?.description).toBe(
        'Topic about pub',
      );
    });

    it.each([
      ['an unpublished subject', () => subjUnpub],
      ['a deleted subject', () => subjDeleted],
      ['an unknown subject', () => GHOST_ID],
    ])('returns 404 for %s', async (_name, id) => {
      await authed('get', `/api/v1/subjects/${id()}/topics`, userToken).expect(
        404,
      );
    });

    it('returns 400 for a malformed subject id', async () => {
      await authed(
        'get',
        '/api/v1/subjects/not-a-uuid/topics',
        userToken,
      ).expect(400);
    });
  });

  describe('GET /topics/{topicId}/questions', () => {
    it('returns only fully published questions, newest first, in the envelope', async () => {
      const response = await authed(
        'get',
        `/api/v1/topics/${tPub}/questions`,
        userToken,
      ).expect(200);
      const body = response.body as QuestionsPage;

      expect(body.totalItems).toBe(2);
      expect(body.items.map((q) => q.id)).toEqual([qMatch.id, qSC.id]);
      expect(body.page).toBe(1);
      expect(body.pageSize).toBe(20);
      expect(body.totalPages).toBe(1);
    });

    it('never leaks answers or internal metadata', async () => {
      const response = await authed(
        'get',
        `/api/v1/topics/${tPub}/questions`,
        userToken,
      ).expect(200);
      const raw = JSON.stringify(response.body);

      expect(raw).not.toContain('isCorrect');
      expect(raw).not.toContain('explanation');
      expect(raw).not.toContain('deletedAt');
      expect(raw).not.toContain('isPublished');
      expect(raw).not.toContain('translations');

      const body = response.body as QuestionsPage;
      const single = body.items.find(
        (q) => q.id === qSC.id,
      ) as PublicQuestionBody;
      expect(Object.keys(single).sort()).toEqual([
        'answerOptions',
        'difficulty',
        'id',
        'imageUrl',
        'title',
        'type',
      ]);
      for (const option of single.answerOptions) {
        expect(Object.keys(option).sort()).toEqual([
          'content',
          'id',
          'imageUrl',
          'order',
        ]);
      }
    });

    it('exposes the configuration for MATCHING and omits it for SINGLE_CHOICE', async () => {
      const response = await authed(
        'get',
        `/api/v1/topics/${tPub}/questions`,
        userToken,
      ).expect(200);
      const body = response.body as QuestionsPage;

      const matchingQ = body.items.find((q) => q.id === qMatch.id);
      const singleQ = body.items.find((q) => q.id === qSC.id);
      expect(matchingQ?.configuration).toEqual({
        pairs: [
          { left: 0, right: 1 },
          { left: 2, right: 3 },
        ],
      });
      expect(singleQ).not.toHaveProperty('configuration');
      expect(matchingQ?.answerOptions.map((o) => o.order)).toEqual([
        0, 1, 2, 3,
      ]);
    });

    it('paginates', async () => {
      const page1 = await authed(
        'get',
        `/api/v1/topics/${tPub}/questions?pageSize=1`,
        userToken,
      ).expect(200);
      const page2 = await authed(
        'get',
        `/api/v1/topics/${tPub}/questions?pageSize=1&page=2`,
        userToken,
      ).expect(200);

      const first = page1.body as QuestionsPage;
      const second = page2.body as QuestionsPage;
      expect(first.totalPages).toBe(2);
      expect(first.items[0].id).toBe(qMatch.id);
      expect(second.items[0].id).toBe(qSC.id);
    });

    it('translates title and option content with per-field fallback', async () => {
      const response = await authed(
        'get',
        `/api/v1/topics/${tPub}/questions?locale=UKRAINIAN`,
        userToken,
      ).expect(200);
      const body = response.body as QuestionsPage;
      const single = body.items.find(
        (q) => q.id === qSC.id,
      ) as PublicQuestionBody;

      expect(single.title).toBe('Скільки буде 2+2?');
      expect(single.answerOptions.map((o) => o.content)).toEqual([
        'Чотири',
        'Five',
      ]);

      // The matching question has no translation — full fallback.
      const matchingQ = body.items.find((q) => q.id === qMatch.id);
      expect(matchingQ?.title).toBe('Phase45 match capitals?');
    });

    it.each([
      ['an unpublished topic', () => tUnpub],
      ['a deleted topic', () => tDeleted],
      ['a published topic under an unpublished subject', () => tUnderUnpub],
      ['an unknown topic', () => GHOST_ID],
    ])('returns 404 for %s', async (_name, id) => {
      await authed('get', `/api/v1/topics/${id()}/questions`, userToken).expect(
        404,
      );
    });

    it.each([
      ['a malformed topic id', '/api/v1/topics/not-a-uuid/questions'],
      ['page=0', `PLACEHOLDER?page=0`],
      ['pageSize=101', `PLACEHOLDER?pageSize=101`],
      ['an unknown query param', `PLACEHOLDER?foo=bar`],
    ])('returns 400 for %s', async (_name, url) => {
      const resolved = url.replace(
        'PLACEHOLDER',
        `/api/v1/topics/${tPub}/questions`,
      );
      await authed('get', resolved, userToken).expect(400);
    });
  });

  describe('ancestor publication chain reacts to changes', () => {
    it('hides a topic and its questions the moment the subject is unpublished', async () => {
      const topicUnderPub2 = await createTopic(subjPub2, 'chained', 1, true);
      const q = (await admin(
        'post',
        '/api/v1/admin/questions',
        {
          topicId: topicUnderPub2,
          type: QuestionType.SINGLE_CHOICE,
          title: 'Phase45 chained?',
          options: [{ content: 'A', isCorrect: true }, { content: 'B' }],
        },
        201,
      )) as { id: string };
      await admin(
        'patch',
        `/api/v1/admin/questions/${q.id}/publish`,
        { isPublished: true },
        200,
      );

      await authed(
        'get',
        `/api/v1/topics/${topicUnderPub2}/questions`,
        userToken,
      ).expect(200);

      await admin(
        'put',
        `/api/v1/admin/subjects/${subjPub2}`,
        { isPublished: false },
        200,
      );

      await authed(
        'get',
        `/api/v1/topics/${topicUnderPub2}/questions`,
        userToken,
      ).expect(404);
      await authed(
        'get',
        `/api/v1/subjects/${subjPub2}/topics`,
        userToken,
      ).expect(404);

      // Restore for any later assertions.
      await admin(
        'put',
        `/api/v1/admin/subjects/${subjPub2}`,
        { isPublished: true },
        200,
      );
    });
  });
});
