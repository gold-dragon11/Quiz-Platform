import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AccountStatus } from '@prisma/client';
import * as jwt from 'jsonwebtoken';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { AppConfig } from './../src/config/configuration';
import { PrismaService } from './../src/prisma/prisma.service';

/** The token pair returned by login and refresh. */
interface TokenPairBody {
  accessToken: string;
  refreshToken: string;
}

/**
 * Refresh + logout end-to-end tests (docs/04-api/authentication.md §7-8).
 */
describe('Refresh & Logout (e2e)', () => {
  const EMAIL_PREFIX = 'phase35-rt';
  const USERNAME_PREFIX = 'phase35rt';
  const PASSWORD = 'ValidPass1!';
  const REGISTER_URL = '/api/v1/auth/register';
  const LOGIN_URL = '/api/v1/auth/login';
  const REFRESH_URL = '/api/v1/auth/refresh';
  const LOGOUT_URL = '/api/v1/auth/logout';
  const ME_URL = '/api/v1/auth/me';

  let app: INestApplication;
  let prisma: PrismaService;
  let refreshSecret: string;
  let counter = 0;

  interface Account {
    email: string;
    userId: string;
    tokens: TokenPairBody;
  }

  const createLoggedInAccount = async (): Promise<Account> => {
    counter += 1;
    const email = `${EMAIL_PREFIX}-${counter}@example.com`;
    const username = `${USERNAME_PREFIX}${counter}`;

    await request(app.getHttpServer())
      .post(REGISTER_URL)
      .send({ email, username, password: PASSWORD })
      .expect(201);

    await prisma.user.update({
      where: { email },
      data: { accountStatus: AccountStatus.ACTIVE },
    });

    const response = await request(app.getHttpServer())
      .post(LOGIN_URL)
      .send({ email, password: PASSWORD })
      .expect(200);

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    return { email, userId: user!.id, tokens: response.body as TokenPairBody };
  };

  const refresh = async (
    refreshToken: string,
    expectedStatus: number,
  ): Promise<TokenPairBody> => {
    const response = await request(app.getHttpServer())
      .post(REFRESH_URL)
      .send({ refreshToken })
      .expect(expectedStatus);

    return response.body as TokenPairBody;
  };

  const logout = async (refreshToken: string): Promise<void> => {
    await request(app.getHttpServer())
      .post(LOGOUT_URL)
      .send({ refreshToken })
      .expect(204);
  };

  const activeSessionCount = async (userId: string): Promise<number> =>
    prisma.refreshToken.count({ where: { userId, revokedAt: null } });

  const removeTestAccounts = async (): Promise<void> => {
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

    const configService =
      app.get<ConfigService<AppConfig, true>>(ConfigService);
    refreshSecret = configService.get('jwt', { infer: true }).refreshSecret;

    await removeTestAccounts();
  });

  afterAll(async () => {
    await removeTestAccounts();
    await app.close();
  });

  describe('session persistence at login', () => {
    it('stores one hashed session row per login', async () => {
      const account = await createLoggedInAccount();

      const sessions = await prisma.refreshToken.findMany({
        where: { userId: account.userId },
      });

      expect(sessions).toHaveLength(1);
      expect(sessions[0].revokedAt).toBeNull();
      expect(sessions[0].expiresAt.getTime()).toBeGreaterThan(Date.now());
      // Argon2 hash only — never the token itself.
      expect(sessions[0].tokenHash).toMatch(/^\$argon2id\$/);
      expect(sessions[0].tokenHash).not.toBe(account.tokens.refreshToken);
    });

    it('links the session row to the token via the jti claim', async () => {
      const account = await createLoggedInAccount();

      const payload = jwt.verify(
        account.tokens.refreshToken,
        refreshSecret,
      ) as jwt.JwtPayload;

      expect(payload.jti).toBeDefined();
      const session = await prisma.refreshToken.findUnique({
        where: { id: payload.jti },
      });
      expect(session?.userId).toBe(account.userId);
    });

    it('supports multiple concurrent sessions per user', async () => {
      const account = await createLoggedInAccount();

      await request(app.getHttpServer())
        .post(LOGIN_URL)
        .send({ email: account.email, password: PASSWORD })
        .expect(200);

      expect(await activeSessionCount(account.userId)).toBe(2);
    });
  });

  describe('POST /auth/refresh', () => {
    it('returns a new token pair', async () => {
      const account = await createLoggedInAccount();

      const rotated = await refresh(account.tokens.refreshToken, 200);

      expect(Object.keys(rotated).sort()).toEqual([
        'accessToken',
        'refreshToken',
      ]);
      // The refresh token is always unique (fresh jti). The access token is
      // stateless and second-granular, so one minted in the same second as
      // login can legitimately be byte-identical — validity is what matters.
      expect(rotated.refreshToken).not.toBe(account.tokens.refreshToken);

      // The new access token works against a protected route.
      await request(app.getHttpServer())
        .get(ME_URL)
        .set('Authorization', `Bearer ${rotated.accessToken}`)
        .expect(200);
    });

    it('rotates: the old refresh token is revoked, the new one works', async () => {
      const account = await createLoggedInAccount();

      const rotated = await refresh(account.tokens.refreshToken, 200);

      // Old token: session row now revoked.
      const oldPayload = jwt.decode(
        account.tokens.refreshToken,
      ) as jwt.JwtPayload;
      const oldSession = await prisma.refreshToken.findUnique({
        where: { id: oldPayload.jti },
      });
      expect(oldSession?.revokedAt).toBeInstanceOf(Date);

      // New token refreshes successfully.
      await refresh(rotated.refreshToken, 200);
    });

    it('rejects an unknown or malformed token with 401', async () => {
      await refresh('not-a-jwt', 401);
    });

    it('rejects an access token used as a refresh token with 401', async () => {
      const account = await createLoggedInAccount();

      await refresh(account.tokens.accessToken, 401);
    });

    it('rejects a forged token whose session does not exist with 401', async () => {
      const account = await createLoggedInAccount();

      const forged = jwt.sign(
        {
          sub: account.userId,
          email: account.email,
          role: 'USER',
          jti: '00000000-0000-4000-8000-000000000000',
        },
        refreshSecret,
        { expiresIn: '7d' },
      );

      await refresh(forged, 401);
    });

    it('rejects an expired refresh token with 401', async () => {
      const account = await createLoggedInAccount();
      const payload = jwt.decode(account.tokens.refreshToken) as jwt.JwtPayload;

      const expired = jwt.sign(
        {
          sub: account.userId,
          email: account.email,
          role: 'USER',
          jti: payload.jti,
        },
        refreshSecret,
        { expiresIn: '-1s' },
      );

      await refresh(expired, 401);
    });

    it('rejects refresh for an account that is no longer active', async () => {
      const account = await createLoggedInAccount();

      await prisma.user.update({
        where: { id: account.userId },
        data: { accountStatus: AccountStatus.SUSPENDED },
      });

      await refresh(account.tokens.refreshToken, 401);
    });

    it('returns a bare 401 that reveals nothing', async () => {
      const response = await request(app.getHttpServer())
        .post(REFRESH_URL)
        .send({ refreshToken: 'not-a-jwt' })
        .expect(401);

      const serialized = JSON.stringify(response.body);
      expect(serialized).not.toContain('signature');
      expect(serialized).not.toContain('expired');
      expect(serialized).not.toContain('revoked');
    });

    it('rejects a missing refreshToken field with 400', async () => {
      await request(app.getHttpServer()).post(REFRESH_URL).send({}).expect(400);
    });
  });

  describe('reuse detection', () => {
    it('revokes every active session when a rotated token is replayed', async () => {
      const account = await createLoggedInAccount();

      // A second device logs in.
      const second = await request(app.getHttpServer())
        .post(LOGIN_URL)
        .send({ email: account.email, password: PASSWORD })
        .expect(200);
      const secondTokens = second.body as TokenPairBody;

      // First device rotates normally…
      const rotated = await refresh(account.tokens.refreshToken, 200);
      expect(await activeSessionCount(account.userId)).toBe(2);

      // …then the SPENT token is replayed (theft signature).
      await refresh(account.tokens.refreshToken, 401);

      // Everything is revoked: the rotated replacement AND the second device.
      expect(await activeSessionCount(account.userId)).toBe(0);
      await refresh(rotated.refreshToken, 401);
      await refresh(secondTokens.refreshToken, 401);
    });

    it('treats a logged-out token replayed at refresh as reuse', async () => {
      const account = await createLoggedInAccount();

      const second = await request(app.getHttpServer())
        .post(LOGIN_URL)
        .send({ email: account.email, password: PASSWORD })
        .expect(200);
      const secondTokens = second.body as TokenPairBody;

      await logout(account.tokens.refreshToken);
      expect(await activeSessionCount(account.userId)).toBe(1);

      // Replaying the logged-out token kills the remaining session too.
      await refresh(account.tokens.refreshToken, 401);
      expect(await activeSessionCount(account.userId)).toBe(0);
      await refresh(secondTokens.refreshToken, 401);
    });
  });

  describe('POST /auth/logout', () => {
    it('revokes the presented token so it cannot refresh afterwards', async () => {
      const account = await createLoggedInAccount();

      await logout(account.tokens.refreshToken);

      expect(await activeSessionCount(account.userId)).toBe(0);
      await refresh(account.tokens.refreshToken, 401);
    });

    it('does not invalidate already-issued access tokens', async () => {
      const account = await createLoggedInAccount();

      await logout(account.tokens.refreshToken);

      // docs/04-api/authentication.md §7: access tokens expire naturally.
      await request(app.getHttpServer())
        .get(ME_URL)
        .set('Authorization', `Bearer ${account.tokens.accessToken}`)
        .expect(200);
    });

    it('only revokes the presented session, not other devices', async () => {
      const account = await createLoggedInAccount();

      const second = await request(app.getHttpServer())
        .post(LOGIN_URL)
        .send({ email: account.email, password: PASSWORD })
        .expect(200);
      const secondTokens = second.body as TokenPairBody;

      await logout(account.tokens.refreshToken);

      expect(await activeSessionCount(account.userId)).toBe(1);
      await refresh(secondTokens.refreshToken, 200);
    });

    it('is idempotent: repeating logout returns 204', async () => {
      const account = await createLoggedInAccount();

      await logout(account.tokens.refreshToken);
      await logout(account.tokens.refreshToken);
      await logout(account.tokens.refreshToken);
    });

    it('returns 204 for an unknown or malformed token', async () => {
      await logout('not-a-jwt');
      await logout(
        jwt.sign(
          {
            sub: '00000000-0000-4000-8000-000000000001',
            jti: '00000000-0000-4000-8000-000000000002',
          },
          refreshSecret,
          { expiresIn: '7d' },
        ),
      );
    });

    it('returns an empty body', async () => {
      const account = await createLoggedInAccount();

      const response = await request(app.getHttpServer())
        .post(LOGOUT_URL)
        .send({ refreshToken: account.tokens.refreshToken })
        .expect(204);

      expect(response.body).toEqual({});
    });

    it('rejects a missing refreshToken field with 400', async () => {
      await request(app.getHttpServer()).post(LOGOUT_URL).send({}).expect(400);
    });
  });
});
