import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AccountStatus } from '@prisma/client';
import cookieParser from 'cookie-parser';
import * as jwt from 'jsonwebtoken';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { REFRESH_COOKIE } from './../src/auth/session-cookie';
import { AppConfig } from './../src/config/configuration';
import { PrismaService } from './../src/prisma/prisma.service';
import { listenOnLoopback } from './loopback';
import {
  cookieFor,
  sessionCookie,
  sessionSetCookie,
  sessionToken,
} from './session-cookie';

/** What login and refresh answer with. The session itself is the cookie. */
interface AccessTokenBody {
  accessToken: string;
}

/**
 * Refresh + logout end-to-end tests (docs/04-api/authentication.md §7-8).
 *
 * The refresh token is an HttpOnly cookie, so these read it off `Set-Cookie`
 * and send it back on `Cookie` — which is all a browser ever does with it.
 * Where a test needs to forge or decode the token itself it works with the
 * value inside that cookie.
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
    accessToken: string;
    /** The `Cookie` header this account's browser would send. */
    cookie: string;
    /** The bare token inside that cookie, for decoding and forging. */
    refreshToken: string;
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

    return {
      email,
      userId: user!.id,
      accessToken: (response.body as AccessTokenBody).accessToken,
      cookie: sessionCookie(response)!,
      refreshToken: sessionToken(response),
    };
  };

  /** Refreshes with the given cookie and returns the whole response. */
  const refreshWith = async (
    cookie: string,
    expectedStatus: number,
  ): Promise<request.Response> =>
    request(app.getHttpServer())
      .post(REFRESH_URL)
      .set('Cookie', cookie)
      .expect(expectedStatus);

  const refresh = async (
    refreshToken: string,
    expectedStatus: number,
  ): Promise<request.Response> =>
    refreshWith(cookieFor(refreshToken), expectedStatus);

  const logout = async (refreshToken: string): Promise<void> => {
    await request(app.getHttpServer())
      .post(LOGOUT_URL)
      .set('Cookie', cookieFor(refreshToken))
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
    // The session arrives as a cookie, so the app under test needs the same
    // parser production mounts (src/main.ts).
    app.use(cookieParser());
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
      expect(sessions[0].tokenHash).not.toBe(account.refreshToken);
    });

    it('links the session row to the token via the jti claim', async () => {
      const account = await createLoggedInAccount();

      const payload = jwt.verify(
        account.refreshToken,
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
    it('answers with an access token and a rotated cookie', async () => {
      const account = await createLoggedInAccount();

      const response = await refresh(account.refreshToken, 200);

      // The body carries the access token and nothing else: the session
      // itself never passes through anything a script could read.
      expect(Object.keys(response.body as object)).toEqual(['accessToken']);
      // The refresh token is always unique (fresh jti). The access token is
      // stateless and second-granular, so one minted in the same second as
      // login can legitimately be byte-identical — validity is what matters.
      expect(sessionToken(response)).not.toBe(account.refreshToken);

      // The new access token works against a protected route.
      await request(app.getHttpServer())
        .get(ME_URL)
        .set(
          'Authorization',
          `Bearer ${(response.body as AccessTokenBody).accessToken}`,
        )
        .expect(200);
    });

    it('marks the cookie so no script can read it and no other site can send it', async () => {
      const account = await createLoggedInAccount();

      const line = sessionSetCookie(await refresh(account.refreshToken, 200))!;

      // HttpOnly is what makes a week-long session defensible: a cross-site
      // scripting flaw cannot read what the page itself cannot read.
      expect(line).toMatch(/HttpOnly/i);
      // SameSite=Lax is the entire CSRF defence for these routes.
      expect(line).toMatch(/SameSite=Lax/i);
      // Narrowed so the cookie does not ride along with every question.
      expect(line).toMatch(/Path=\/api\/v1\/auth/i);
      // It must outlive the browser being closed — that is the whole point.
      expect(line).toMatch(/Expires=/i);
    });

    it('rotates: the old refresh token is revoked, the new one works', async () => {
      const account = await createLoggedInAccount();

      const rotated = sessionToken(await refresh(account.refreshToken, 200));

      // Old token: session row now revoked.
      const oldPayload = jwt.decode(account.refreshToken) as jwt.JwtPayload;
      const oldSession = await prisma.refreshToken.findUnique({
        where: { id: oldPayload.jti },
      });
      expect(oldSession?.revokedAt).toBeInstanceOf(Date);

      // New token refreshes successfully.
      await refresh(rotated, 200);
    });

    it('rejects an unknown or malformed token with 401', async () => {
      await refresh('not-a-jwt', 401);
    });

    it('rejects an access token used as a refresh token with 401', async () => {
      const account = await createLoggedInAccount();

      await refresh(account.accessToken, 401);
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
      const payload = jwt.decode(account.refreshToken) as jwt.JwtPayload;

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

      await refresh(account.refreshToken, 401);
    });

    it('returns a bare 401 that reveals nothing', async () => {
      const response = await request(app.getHttpServer())
        .post(REFRESH_URL)
        .set('Cookie', cookieFor('not-a-jwt'))
        .expect(401);

      const serialized = JSON.stringify(response.body);
      expect(serialized).not.toContain('signature');
      expect(serialized).not.toContain('expired');
      expect(serialized).not.toContain('revoked');
    });

    it('treats no cookie at all as not signed in', async () => {
      // How every cold start of the app asks «is anyone signed in here?».
      await request(app.getHttpServer()).post(REFRESH_URL).expect(401);
    });

    it('no longer accepts a token handed to it in the body', async () => {
      const account = await createLoggedInAccount();

      await request(app.getHttpServer())
        .post(REFRESH_URL)
        .send({ refreshToken: account.refreshToken })
        .expect(401);

      // And the session it refused is still usable, so the refusal cost the
      // reader nothing.
      await refresh(account.refreshToken, 200);
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
      const secondToken = sessionToken(second);

      // First device rotates normally…
      const rotated = sessionToken(await refresh(account.refreshToken, 200));
      expect(await activeSessionCount(account.userId)).toBe(2);

      // …then the SPENT token is replayed (theft signature).
      await refresh(account.refreshToken, 401);

      // Everything is revoked: the rotated replacement AND the second device.
      expect(await activeSessionCount(account.userId)).toBe(0);
      await refresh(rotated, 401);
      await refresh(secondToken, 401);
    });

    it('treats a logged-out token replayed at refresh as reuse', async () => {
      const account = await createLoggedInAccount();

      const second = await request(app.getHttpServer())
        .post(LOGIN_URL)
        .send({ email: account.email, password: PASSWORD })
        .expect(200);
      const secondToken = sessionToken(second);

      await logout(account.refreshToken);
      expect(await activeSessionCount(account.userId)).toBe(1);

      // Replaying the logged-out token kills the remaining session too.
      await refresh(account.refreshToken, 401);
      expect(await activeSessionCount(account.userId)).toBe(0);
      await refresh(secondToken, 401);
    });
  });

  describe('POST /auth/logout', () => {
    it('revokes the presented token so it cannot refresh afterwards', async () => {
      const account = await createLoggedInAccount();

      await logout(account.refreshToken);

      expect(await activeSessionCount(account.userId)).toBe(0);
      await refresh(account.refreshToken, 401);
    });

    it('does not invalidate already-issued access tokens', async () => {
      const account = await createLoggedInAccount();

      await logout(account.refreshToken);

      // docs/04-api/authentication.md §7: access tokens expire naturally.
      await request(app.getHttpServer())
        .get(ME_URL)
        .set('Authorization', `Bearer ${account.accessToken}`)
        .expect(200);
    });

    it('only revokes the presented session, not other devices', async () => {
      const account = await createLoggedInAccount();

      const second = await request(app.getHttpServer())
        .post(LOGIN_URL)
        .send({ email: account.email, password: PASSWORD })
        .expect(200);
      const secondToken = sessionToken(second);

      await logout(account.refreshToken);

      expect(await activeSessionCount(account.userId)).toBe(1);
      await refresh(secondToken, 200);
    });

    it('is idempotent: repeating logout returns 204', async () => {
      const account = await createLoggedInAccount();

      await logout(account.refreshToken);
      await logout(account.refreshToken);
      await logout(account.refreshToken);
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

    it('returns an empty body and takes the cookie away', async () => {
      const account = await createLoggedInAccount();

      const response = await request(app.getHttpServer())
        .post(LOGOUT_URL)
        .set('Cookie', account.cookie)
        .expect(204);

      expect(response.body).toEqual({});
      // Emptied, not merely revoked server-side: the browser must stop
      // carrying a token that no longer means anything.
      expect(sessionSetCookie(response)).toMatch(
        new RegExp(`^${REFRESH_COOKIE}=;`),
      );
    });

    it('succeeds with no cookie at all', async () => {
      // A reader whose cookie already expired still has to be able to leave.
      await request(app.getHttpServer()).post(LOGOUT_URL).expect(204);
    });
  });
});
