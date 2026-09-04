import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AccountStatus, UserRole } from '@prisma/client';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

interface AdminUserBody {
  id: string;
  email: string;
  role: UserRole;
  accountStatus: AccountStatus;
  createdAt: string;
  username: string | null;
  displayName: string | null;
}

interface PageBody {
  items: AdminUserBody[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

/**
 * The account directory and the one role decision an administrator makes.
 *
 * The rules worth protecting here are all about what this endpoint must never
 * become: a way to mint administrators, or to remove the last one.
 */
describe('Admin users (e2e)', () => {
  const PREFIX = 'adminusers';
  const PASSWORD = 'ValidPass1!';
  const USERS_URL = '/api/v1/admin/users';

  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let userToken: string;
  let counter = 0;

  const register = async (
    role: UserRole = UserRole.USER,
  ): Promise<{
    id: string;
    email: string;
    username: string;
    token: string;
  }> => {
    counter += 1;
    const email = `${PREFIX}-${counter}@example.com`;
    const username = `${PREFIX}${counter}`;

    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, username, password: PASSWORD })
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
      id: user.id,
      email,
      username,
      token: (login.body as { accessToken: string }).accessToken,
    };
  };

  const setRole = (
    userId: string,
    body: Record<string, unknown>,
    token = adminToken,
  ) =>
    request(app.getHttpServer())
      .patch(`${USERS_URL}/${userId}/role`)
      .set('Authorization', `Bearer ${token}`)
      .send(body);

  const removeFixtures = async (): Promise<void> => {
    await prisma.user.deleteMany({ where: { email: { startsWith: PREFIX } } });
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
    await removeFixtures();

    adminToken = (await register(UserRole.ADMIN)).token;
    userToken = (await register(UserRole.USER)).token;
  });

  afterAll(async () => {
    await removeFixtures();
    await app.close();
  });

  describe('route protection', () => {
    it('refuses an unauthenticated caller', async () => {
      await request(app.getHttpServer()).get(USERS_URL).expect(401);
    });

    it('refuses an ordinary account', async () => {
      await request(app.getHttpServer())
        .get(USERS_URL)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('refuses an ordinary account trying to promote itself', async () => {
      const learner = await register();

      await setRole(
        learner.id,
        { role: UserRole.TEACHER },
        learner.token,
      ).expect(403);

      const after = await prisma.user.findUniqueOrThrow({
        where: { id: learner.id },
        select: { role: true },
      });
      expect(after.role).toBe(UserRole.USER);
    });
  });

  describe('the directory', () => {
    it('finds an account by username, email and display name', async () => {
      const learner = await register();

      for (const term of [learner.username, learner.email]) {
        const response = await request(app.getHttpServer())
          .get(USERS_URL)
          .query({ search: term })
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        const body = response.body as PageBody;
        expect(body.items.map((item) => item.id)).toContain(learner.id);
      }
    });

    it('narrows to one role', async () => {
      const teacher = await register(UserRole.TEACHER);

      const response = await request(app.getHttpServer())
        .get(USERS_URL)
        .query({ role: UserRole.TEACHER, search: PREFIX })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const body = response.body as PageBody;
      expect(body.items.map((item) => item.id)).toContain(teacher.id);
      expect(body.items.every((item) => item.role === UserRole.TEACHER)).toBe(
        true,
      );
    });

    it('leaves deleted accounts out — a role on an unusable account decides nothing', async () => {
      const learner = await register();
      await prisma.user.update({
        where: { id: learner.id },
        data: { accountStatus: AccountStatus.DELETED },
      });

      const response = await request(app.getHttpServer())
        .get(USERS_URL)
        .query({ search: learner.username })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect((response.body as PageBody).items).toHaveLength(0);
    });

    it('uses the same pagination envelope as every other admin collection', async () => {
      const response = await request(app.getHttpServer())
        .get(USERS_URL)
        .query({ search: PREFIX, pageSize: 2 })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // docs/04-api/admin.md §12. A directory that paginated differently from
      // the other four admin lists would need its own client-side handling for
      // no reason anybody could name.
      const body = response.body as PageBody;
      expect(Object.keys(body).sort()).toEqual([
        'items',
        'page',
        'pageSize',
        'totalItems',
        'totalPages',
      ]);
      expect(body.pageSize).toBe(2);
      expect(body.totalPages).toBe(Math.max(Math.ceil(body.totalItems / 2), 1));
    });

    it('never returns a password hash', async () => {
      const response = await request(app.getHttpServer())
        .get(USERS_URL)
        .query({ search: PREFIX })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(JSON.stringify(response.body)).not.toContain('passwordHash');
    });
  });

  describe('the role decision', () => {
    it('makes an ordinary account a teacher, and takes it back', async () => {
      const learner = await register();

      const promoted = await setRole(learner.id, {
        role: UserRole.TEACHER,
      }).expect(200);
      expect((promoted.body as AdminUserBody).role).toBe(UserRole.TEACHER);

      const demoted = await setRole(learner.id, { role: UserRole.USER }).expect(
        200,
      );
      expect((demoted.body as AdminUserBody).role).toBe(UserRole.USER);
    });

    it('refuses to mint an administrator', async () => {
      const learner = await register();

      // The whole point of the endpoint's narrow vocabulary: an HTTP route
      // that can grant ADMIN is one compromised session away from permanent.
      await setRole(learner.id, { role: UserRole.ADMIN }).expect(400);

      const after = await prisma.user.findUniqueOrThrow({
        where: { id: learner.id },
        select: { role: true },
      });
      expect(after.role).toBe(UserRole.USER);
    });

    it('refuses to touch an administrator account', async () => {
      const other = await register(UserRole.ADMIN);

      // The other half of the same rule: no path here ends with a platform
      // that has no administrators left.
      await setRole(other.id, { role: UserRole.USER }).expect(409);

      const after = await prisma.user.findUniqueOrThrow({
        where: { id: other.id },
        select: { role: true },
      });
      expect(after.role).toBe(UserRole.ADMIN);
    });

    it('refuses a deleted account', async () => {
      const learner = await register();
      await prisma.user.update({
        where: { id: learner.id },
        data: { accountStatus: AccountStatus.DELETED },
      });

      await setRole(learner.id, { role: UserRole.TEACHER }).expect(409);
    });

    it('answers 404 for an account that does not exist', async () => {
      await setRole('00000000-0000-0000-0000-000000000000', {
        role: UserRole.TEACHER,
      }).expect(404);
    });

    it('rejects anything beyond the role in the body', async () => {
      const learner = await register();

      await setRole(learner.id, {
        role: UserRole.TEACHER,
        accountStatus: AccountStatus.SUSPENDED,
      }).expect(400);
    });
  });
});
