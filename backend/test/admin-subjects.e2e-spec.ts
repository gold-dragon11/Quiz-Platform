import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AccountStatus, Language, UserRole } from '@prisma/client';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

interface SubjectBody {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  isPublished: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface PageBody {
  items: SubjectBody[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

/**
 * Admin Subjects CRUD end-to-end tests (docs/04-api/admin.md §4).
 */
describe('Admin Subjects (e2e)', () => {
  const EMAIL_PREFIX = 'phase41-subj';
  const USERNAME_PREFIX = 'phase41subj';
  const SLUG_PREFIX = 'p41';
  const PASSWORD = 'ValidPass1!';
  const REGISTER_URL = '/api/v1/auth/register';
  const LOGIN_URL = '/api/v1/auth/login';
  const SUBJECTS_URL = '/api/v1/admin/subjects';

  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let userToken: string;
  let counter = 0;

  const uniqueSubject = (): { name: string; slug: string } => {
    counter += 1;
    return {
      name: `Phase41 Subject ${counter}`,
      slug: `${SLUG_PREFIX}-subject-${counter}`,
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

  const createSubject = async (
    payload: Record<string, unknown>,
    expectedStatus = 201,
  ): Promise<SubjectBody> => {
    const response = await request(app.getHttpServer())
      .post(SUBJECTS_URL)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(payload)
      .expect(expectedStatus);
    return response.body as SubjectBody;
  };

  const updateSubject = async (
    id: string,
    payload: Record<string, unknown>,
    expectedStatus = 200,
  ): Promise<Record<string, unknown>> => {
    const response = await request(app.getHttpServer())
      .put(`${SUBJECTS_URL}/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(payload)
      .expect(expectedStatus);
    return response.body as Record<string, unknown>;
  };

  const listSubjects = async (query = ''): Promise<PageBody> => {
    const response = await request(app.getHttpServer())
      .get(`${SUBJECTS_URL}${query}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    return response.body as PageBody;
  };

  const removeTestData = async (): Promise<void> => {
    // Hard cleanup of fixtures only — translations cascade with subjects.
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
  });

  afterAll(async () => {
    await removeTestData();
    await app.close();
  });

  describe('route protection', () => {
    it.each([
      ['GET list', 'get', SUBJECTS_URL],
      ['POST create', 'post', SUBJECTS_URL],
      [
        'PUT update',
        'put',
        `${SUBJECTS_URL}/00000000-0000-0000-0000-000000000000`,
      ],
      [
        'DELETE remove',
        'delete',
        `${SUBJECTS_URL}/00000000-0000-0000-0000-000000000000`,
      ],
    ] as const)(
      '%s rejects a missing token with 401',
      async (_name, method, url) => {
        await request(app.getHttpServer())[method](url).expect(401);
      },
    );

    it.each([
      ['GET list', 'get', SUBJECTS_URL],
      ['POST create', 'post', SUBJECTS_URL],
      [
        'PUT update',
        'put',
        `${SUBJECTS_URL}/00000000-0000-0000-0000-000000000000`,
      ],
      [
        'DELETE remove',
        'delete',
        `${SUBJECTS_URL}/00000000-0000-0000-0000-000000000000`,
      ],
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

  describe('POST /admin/subjects', () => {
    it('creates a subject with all fields and returns it', async () => {
      const base = uniqueSubject();
      const body = await createSubject({
        ...base,
        description: 'A subject',
        icon: 'atom',
        color: '#A1B2C3',
        displayOrder: 500,
      });

      expect(body).toMatchObject({
        ...base,
        description: 'A subject',
        icon: 'atom',
        color: '#A1B2C3',
        isPublished: false,
        displayOrder: 500,
      });
      expect(body.id).toBeDefined();
      expect(body.createdAt).toBeDefined();
      expect(body.updatedAt).toBeDefined();
      expect(body).not.toHaveProperty('deletedAt');
    });

    it('starts unpublished and rejects isPublished at creation', async () => {
      await createSubject({ ...uniqueSubject(), isPublished: true }, 400);
    });

    it('rejects locale at creation', async () => {
      await createSubject(
        { ...uniqueSubject(), locale: Language.UKRAINIAN },
        400,
      );
    });

    it('auto-assigns displayOrder = max + 1 when omitted', async () => {
      const first = await createSubject({
        ...uniqueSubject(),
        displayOrder: 900,
      });
      const second = await createSubject(uniqueSubject());

      expect(second.displayOrder).toBe(first.displayOrder + 1);
    });

    it('returns 409 for a duplicate name', async () => {
      const base = uniqueSubject();
      await createSubject(base);

      const other = uniqueSubject();
      const body = await createSubject(
        { name: base.name, slug: other.slug },
        409,
      );
      expect(body).toMatchObject({
        statusCode: 409,
        message: 'A subject with this name already exists.',
      });
    });

    it('returns 409 for a duplicate slug', async () => {
      const base = uniqueSubject();
      await createSubject(base);

      const other = uniqueSubject();
      await createSubject({ name: other.name, slug: base.slug }, 409);
    });

    it('returns 409 for a duplicate displayOrder', async () => {
      const first = await createSubject({
        ...uniqueSubject(),
        displayOrder: 910,
      });
      await createSubject(
        { ...uniqueSubject(), displayOrder: first.displayOrder },
        409,
      );
    });

    it.each([
      ['missing name', { slug: 'p41-x-valid' }],
      ['empty name', { name: '', slug: 'p41-x-valid' }],
      ['name too long', { name: 'a'.repeat(101), slug: 'p41-x-valid' }],
      ['uppercase slug', { name: 'P41 X', slug: 'P41-Bad' }],
      ['slug with spaces', { name: 'P41 X', slug: 'p41 bad' }],
      ['trailing hyphen slug', { name: 'P41 X', slug: 'p41-bad-' }],
      ['bad color', { name: 'P41 X', slug: 'p41-x-valid', color: 'red' }],
      [
        'short hex color',
        { name: 'P41 X', slug: 'p41-x-valid', color: '#FFF' },
      ],
      [
        'negative displayOrder',
        { name: 'P41 X', slug: 'p41-x-valid', displayOrder: -1 },
      ],
      [
        'fractional displayOrder',
        { name: 'P41 X', slug: 'p41-x-valid', displayOrder: 1.5 },
      ],
      [
        'description too long',
        { name: 'P41 X', slug: 'p41-x-valid', description: 'a'.repeat(501) },
      ],
      ['unknown field', { name: 'P41 X', slug: 'p41-x-valid', extra: true }],
    ])('rejects %s with 400', async (_name, payload) => {
      await createSubject(payload, 400);
    });
  });

  describe('GET /admin/subjects', () => {
    it('returns the pagination envelope with defaults', async () => {
      await createSubject(uniqueSubject());

      const body = await listSubjects();

      expect(body.page).toBe(1);
      expect(body.pageSize).toBe(20);
      expect(body.totalPages).toBe(Math.ceil(body.totalItems / 20));
      expect(Array.isArray(body.items)).toBe(true);
      expect(body.totalItems).toBeGreaterThan(0);
    });

    it('paginates', async () => {
      await createSubject(uniqueSubject());
      await createSubject(uniqueSubject());

      const body = await listSubjects('?page=1&pageSize=2');

      expect(body.items).toHaveLength(2);
      expect(body.pageSize).toBe(2);
      expect(body.totalPages).toBe(Math.ceil(body.totalItems / 2));
    });

    it('includes unpublished subjects and filters by isPublished', async () => {
      const created = await createSubject(uniqueSubject());
      await updateSubject(created.id, { isPublished: true });

      const published = await listSubjects('?isPublished=true');
      const unpublished = await listSubjects('?isPublished=false');

      expect(published.items.some((s) => s.id === created.id)).toBe(true);
      expect(unpublished.items.some((s) => s.id === created.id)).toBe(false);
      expect(unpublished.items.every((s) => !s.isPublished)).toBe(true);
    });

    it('searches name and slug case-insensitively', async () => {
      const created = await createSubject({
        name: 'Phase41 Searchable Chemistry',
        slug: `${SLUG_PREFIX}-searchable-chem`,
      });

      const byName = await listSubjects('?search=SEARCHABLE%20CHEM');
      const bySlug = await listSubjects('?search=searchable-chem');

      expect(byName.items.some((s) => s.id === created.id)).toBe(true);
      expect(bySlug.items.some((s) => s.id === created.id)).toBe(true);
    });

    it('sorts by name descending on request', async () => {
      const body = await listSubjects(
        '?sortBy=name&sortOrder=desc&pageSize=100',
      );

      const names = body.items.map((s) => s.name);
      expect(names).toEqual([...names].sort().reverse());
    });

    it('defaults to displayOrder ascending', async () => {
      const body = await listSubjects('?pageSize=100');

      const orders = body.items.map((s) => s.displayOrder);
      expect(orders).toEqual([...orders].sort((a, b) => a - b));
    });

    it.each([
      ['page=0', '?page=0'],
      ['pageSize=0', '?pageSize=0'],
      ['pageSize>100', '?pageSize=101'],
      ['bad sortBy', '?sortBy=slug'],
      ['bad sortOrder', '?sortOrder=up'],
      ['bad isPublished', '?isPublished=yes'],
      ['unknown param', '?foo=bar'],
    ])('rejects %s with 400', async (_name, query) => {
      await request(app.getHttpServer())
        .get(`${SUBJECTS_URL}${query}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });
  });

  describe('PUT /admin/subjects/{id}', () => {
    it('merges: only supplied fields change', async () => {
      const created = await createSubject({
        ...uniqueSubject(),
        description: 'Original description',
        icon: 'original-icon',
      });

      const body = await updateSubject(created.id, {
        name: `${created.name} v2`,
      });

      expect(body).toMatchObject({
        name: `${created.name} v2`,
        slug: created.slug,
        description: 'Original description',
        icon: 'original-icon',
        displayOrder: created.displayOrder,
        isPublished: false,
      });
    });

    it('clears nullable fields with explicit null', async () => {
      const created = await createSubject({
        ...uniqueSubject(),
        description: 'To be cleared',
        icon: 'x',
        color: '#123456',
      });

      const body = await updateSubject(created.id, {
        description: null,
        icon: null,
        color: null,
      });

      expect(body.description).toBeNull();
      expect(body.icon).toBeNull();
      expect(body.color).toBeNull();
    });

    it('publishes and unpublishes', async () => {
      const created = await createSubject(uniqueSubject());

      const published = await updateSubject(created.id, { isPublished: true });
      expect(published.isPublished).toBe(true);

      const unpublished = await updateSubject(created.id, {
        isPublished: false,
      });
      expect(unpublished.isPublished).toBe(false);
    });

    it('rejects null for non-nullable fields', async () => {
      const created = await createSubject(uniqueSubject());

      await updateSubject(created.id, { name: null }, 400);
      await updateSubject(created.id, { slug: null }, 400);
      await updateSubject(created.id, { isPublished: null }, 400);
      await updateSubject(created.id, { displayOrder: null }, 400);
    });

    it('allows re-submitting the subject’s own unique values', async () => {
      const created = await createSubject(uniqueSubject());

      await updateSubject(created.id, {
        name: created.name,
        slug: created.slug,
        displayOrder: created.displayOrder,
      });
    });

    it('returns 409 when taking another subject’s name, slug, or displayOrder', async () => {
      const first = await createSubject(uniqueSubject());
      const second = await createSubject(uniqueSubject());

      await updateSubject(second.id, { name: first.name }, 409);
      await updateSubject(second.id, { slug: first.slug }, 409);
      await updateSubject(second.id, { displayOrder: first.displayOrder }, 409);
    });

    it('returns 404 for an unknown id and 400 for a malformed id', async () => {
      await updateSubject(
        '00000000-0000-0000-0000-000000000000',
        { name: 'X' },
        404,
      );

      await request(app.getHttpServer())
        .put(`${SUBJECTS_URL}/not-a-uuid`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'X' })
        .expect(400);
    });
  });

  describe('PUT /admin/subjects/{id} with locale', () => {
    it('creates a translation, then merge-updates it', async () => {
      const created = await createSubject(uniqueSubject());

      const createdTranslation = await updateSubject(created.id, {
        locale: Language.UKRAINIAN,
        name: 'Математика',
        description: 'Опис',
      });
      expect(createdTranslation).toEqual({
        locale: Language.UKRAINIAN,
        name: 'Математика',
        description: 'Опис',
      });

      const updatedTranslation = await updateSubject(created.id, {
        locale: Language.UKRAINIAN,
        description: 'Новий опис',
      });
      expect(updatedTranslation).toEqual({
        locale: Language.UKRAINIAN,
        name: 'Математика',
        description: 'Новий опис',
      });

      const row = await prisma.subjectTranslation.findUnique({
        where: {
          subjectId_locale: {
            subjectId: created.id,
            locale: Language.UKRAINIAN,
          },
        },
      });
      expect(row).toMatchObject({
        name: 'Математика',
        description: 'Новий опис',
      });

      // The default-locale record is untouched.
      const list = await listSubjects('?pageSize=100');
      const subject = list.items.find((s) => s.id === created.id);
      expect(subject?.name).toBe(created.name);
    });

    it('requires name when the translation does not exist yet', async () => {
      const created = await createSubject(uniqueSubject());

      await updateSubject(
        created.id,
        { locale: Language.UKRAINIAN, description: 'Тільки опис' },
        400,
      );
    });

    it('rejects the default locale', async () => {
      const created = await createSubject(uniqueSubject());

      await updateSubject(
        created.id,
        { locale: Language.ENGLISH, name: 'English name' },
        400,
      );
    });

    it('rejects non-localizable fields alongside locale', async () => {
      const created = await createSubject(uniqueSubject());

      await updateSubject(
        created.id,
        { locale: Language.UKRAINIAN, name: 'Імʼя', slug: 'p41-nope' },
        400,
      );
      await updateSubject(
        created.id,
        { locale: Language.UKRAINIAN, name: 'Імʼя', isPublished: true },
        400,
      );
    });

    it('returns 404 for an unknown subject', async () => {
      await updateSubject(
        '00000000-0000-0000-0000-000000000000',
        { locale: Language.UKRAINIAN, name: 'X' },
        404,
      );
    });
  });

  describe('DELETE /admin/subjects/{id}', () => {
    it('soft deletes: 204, hidden from listings, row retained', async () => {
      const created = await createSubject(uniqueSubject());

      await request(app.getHttpServer())
        .delete(`${SUBJECTS_URL}/${created.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);

      const list = await listSubjects('?pageSize=100');
      expect(list.items.some((s) => s.id === created.id)).toBe(false);

      const row = await prisma.subject.findUnique({
        where: { id: created.id },
      });
      expect(row).not.toBeNull();
      expect(row!.deletedAt).not.toBeNull();
    });

    it('returns 404 on repeat delete and on updating a deleted subject', async () => {
      const created = await createSubject(uniqueSubject());

      await request(app.getHttpServer())
        .delete(`${SUBJECTS_URL}/${created.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);
      await request(app.getHttpServer())
        .delete(`${SUBJECTS_URL}/${created.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      await updateSubject(created.id, { name: 'Ghost' }, 404);
    });

    it('keeps name and slug reserved after deletion', async () => {
      const base = uniqueSubject();
      const created = await createSubject(base);

      await request(app.getHttpServer())
        .delete(`${SUBJECTS_URL}/${created.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);

      const other = uniqueSubject();
      await createSubject({ name: base.name, slug: other.slug }, 409);
      await createSubject({ name: other.name, slug: base.slug }, 409);
    });

    it('frees the displayOrder of a deleted subject', async () => {
      const created = await createSubject({
        ...uniqueSubject(),
        displayOrder: 5000,
      });

      await request(app.getHttpServer())
        .delete(`${SUBJECTS_URL}/${created.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);

      const replacement = await createSubject({
        ...uniqueSubject(),
        displayOrder: 5000,
      });
      expect(replacement.displayOrder).toBe(5000);
    });
  });
});
