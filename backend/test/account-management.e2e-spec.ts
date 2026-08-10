import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AccountStatus } from '@prisma/client';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

interface AccountBody {
  id: string;
  email: string;
  accountStatus: string;
  emailVerified: boolean;
  createdAt: string;
}

interface Tokens {
  accessToken: string;
  refreshToken: string;
}

/**
 * Account Management — Phase 5.5 (docs/04-api/users.md §4, §6-7, §10).
 */
describe('Account Management (e2e)', () => {
  const EMAIL_PREFIX = 'phase55-acct';
  const USERNAME_PREFIX = 'phase55acct';
  const PASSWORD = 'ValidPass1!';
  const NEW_PASSWORD = 'NewValid2@';

  let app: INestApplication;
  let prisma: PrismaService;
  let counter = 0;

  // Registers + activates a user, returns tokens, ids, and credentials.
  const register = async (): Promise<{
    tokens: Tokens;
    userId: string;
    email: string;
    username: string;
  }> => {
    counter += 1;
    const email = `${EMAIL_PREFIX}-${counter}@example.com`;
    const username = `${USERNAME_PREFIX}${counter}`;
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, username, password: PASSWORD })
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
    return { tokens: login.body as Tokens, userId: user.id, email, username };
  };

  const removeTestData = async (): Promise<void> => {
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
  });

  afterAll(async () => {
    await removeTestData();
    await app.close();
  });

  describe('authentication', () => {
    it('protects self-only routes with 401', async () => {
      await request(app.getHttpServer()).get('/api/v1/users/me').expect(401);
      await request(app.getHttpServer())
        .get('/api/v1/users/me/avatar')
        .expect(401);
      await request(app.getHttpServer())
        .patch('/api/v1/users/me/password')
        .expect(401);
      await request(app.getHttpServer()).delete('/api/v1/users/me').expect(401);
    });
  });

  describe('GET /users/me', () => {
    it('returns exactly the documented account fields and does not shadow /auth/me', async () => {
      const { tokens, userId, email } = await register();
      const res = await request(app.getHttpServer())
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .expect(200);
      const body = res.body as AccountBody;

      expect(Object.keys(body).sort()).toEqual(
        ['accountStatus', 'createdAt', 'email', 'emailVerified', 'id'].sort(),
      );
      expect(body).toMatchObject({
        id: userId,
        email,
        accountStatus: AccountStatus.ACTIVE,
      });
      // No profile/settings leakage.
      const raw = JSON.stringify(body);
      expect(raw).not.toContain('username');
      expect(raw).not.toContain('language');

      // /auth/me still returns the fuller summary (unchanged).
      const me = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .expect(200);
      expect(me.body).toHaveProperty('profile');
      expect(me.body).toHaveProperty('settings');
    });
  });

  describe('GET /users/me/avatar', () => {
    it('returns the active avatar (default at registration)', async () => {
      const { tokens } = await register();
      const res = await request(app.getHttpServer())
        .get('/api/v1/users/me/avatar')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .expect(200);
      expect(res.body).toEqual({
        type: 'PREDEFINED',
        imageUrl: '/avatars/default.png',
      });
    });
  });

  describe('PATCH /users/me/password', () => {
    it('changes the password (204), lets the new one log in, blocks the old, and revokes refresh sessions', async () => {
      const { tokens, email } = await register();

      await request(app.getHttpServer())
        .patch('/api/v1/users/me/password')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({ currentPassword: PASSWORD, newPassword: NEW_PASSWORD })
        .expect(204);

      // Old password rejected, new password works.
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password: PASSWORD })
        .expect(401);
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password: NEW_PASSWORD })
        .expect(200);

      // The pre-change refresh token was revoked → 401.
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: tokens.refreshToken })
        .expect(401);
    });

    it('rejects a wrong current password with a generic 400', async () => {
      const { tokens } = await register();
      const res = await request(app.getHttpServer())
        .patch('/api/v1/users/me/password')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({ currentPassword: 'WrongPass9!', newPassword: NEW_PASSWORD })
        .expect(400);
      expect((res.body as { message: string }).message).toBe(
        'Поточний пароль неправильний.',
      );
    });

    it('rejects a new password identical to the current one with 400', async () => {
      const { tokens } = await register();
      const res = await request(app.getHttpServer())
        .patch('/api/v1/users/me/password')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({ currentPassword: PASSWORD, newPassword: PASSWORD })
        .expect(400);
      expect((res.body as { message: string }).message).toBe(
        'Новий пароль має відрізнятися від поточного.',
      );
    });

    it.each([
      ['missing currentPassword', { newPassword: NEW_PASSWORD }],
      ['weak new password', { currentPassword: PASSWORD, newPassword: 'weak' }],
      [
        'unknown field',
        { currentPassword: PASSWORD, newPassword: NEW_PASSWORD, foo: 1 },
      ],
    ])('rejects %s with 400', async (_n, body) => {
      const { tokens } = await register();
      await request(app.getHttpServer())
        .patch('/api/v1/users/me/password')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send(body)
        .expect(400);
    });
  });

  describe('DELETE /users/me', () => {
    it('soft-deletes (204), blocks login and refresh, preserves the row, reserves email/username', async () => {
      const { tokens, userId, email, username } = await register();

      await request(app.getHttpServer())
        .delete('/api/v1/users/me')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .expect(204);

      // Row retained, status DELETED.
      const row = await prisma.user.findUnique({ where: { id: userId } });
      expect(row).not.toBeNull();
      expect(row!.accountStatus).toBe(AccountStatus.DELETED);

      // Login blocked (same 401 as invalid credentials); refresh revoked.
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password: PASSWORD })
        .expect(401);
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: tokens.refreshToken })
        .expect(401);

      // The old access token no longer authorizes (strategy rejects non-active).
      await request(app.getHttpServer())
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .expect(401);

      // Public profile of a deleted account is 404.
      await request(app.getHttpServer())
        .get(`/api/v1/users/${username}`)
        .expect(404);

      // Email and username remain reserved — re-registration conflicts.
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email, username: `${username}x`, password: PASSWORD })
        .expect(409);
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email: `x-${email}`, username, password: PASSWORD })
        .expect(409);
    });

    it('preserves historical learning data on deletion', async () => {
      const { tokens, userId } = await register();
      // Seed a minimal completed-session footprint directly is out of scope;
      // deletion must simply never touch historical tables. Verify the
      // account's owned records survive.
      await request(app.getHttpServer())
        .delete('/api/v1/users/me')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .expect(204);

      const profile = await prisma.profile.findUnique({ where: { userId } });
      const stats = await prisma.statistics.findUnique({ where: { userId } });
      const settings = await prisma.userSettings.findUnique({
        where: { userId },
      });
      expect(profile).not.toBeNull();
      expect(stats).not.toBeNull();
      expect(settings).not.toBeNull();
    });
  });
});
