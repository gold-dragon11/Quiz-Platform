import {
  Controller,
  Get,
  INestApplication,
  Logger,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AccountStatus, UserRole } from '@prisma/client';
import * as jwt from 'jsonwebtoken';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { AdminOnly } from './../src/auth/decorators/admin-only.decorator';
import { JwtAuthGuard } from './../src/auth/guards/jwt-auth.guard';
import { AppConfig } from './../src/config/configuration';
import { PrismaService } from './../src/prisma/prisma.service';

/**
 * Test-only controller exercising the authorization layer. It is registered
 * only inside this suite's TestingModule — it never ships in AppModule. Real
 * endpoints adopt the same decorators in their own phases.
 */
@Controller('authz-probe')
class AuthorizationProbeController {
  /** Administrator-only route (docs/06-backend/security.md §6-7). */
  @AdminOnly()
  @Get('admin')
  adminRoute(): { scope: string } {
    return { scope: 'admin' };
  }

  /** Any authenticated user — authentication alone, no role requirement. */
  @UseGuards(JwtAuthGuard)
  @Get('authenticated')
  authenticatedRoute(): { scope: string } {
    return { scope: 'authenticated' };
  }

  /** No guards — proves protection is opt-in per route. */
  @Get('public')
  publicRoute(): { scope: string } {
    return { scope: 'public' };
  }
}

/**
 * Authorization end-to-end tests (docs/06-backend/security.md §6-7,
 * docs/06-backend/authentication.md §10).
 */
describe('Authorization (e2e)', () => {
  const EMAIL_PREFIX = 'phase38-authz';
  const USERNAME_PREFIX = 'phase38authz';
  const PASSWORD = 'ValidPass1!';
  const REGISTER_URL = '/api/v1/auth/register';
  const LOGIN_URL = '/api/v1/auth/login';
  const ADMIN_URL = '/api/v1/authz-probe/admin';
  const AUTHENTICATED_URL = '/api/v1/authz-probe/authenticated';
  const PUBLIC_URL = '/api/v1/authz-probe/public';

  let app: INestApplication;
  let prisma: PrismaService;
  let accessSecret: string;
  let refreshSecret: string;
  let counter = 0;

  const registerAccount = async (
    role: UserRole,
  ): Promise<{ email: string; userId: string; accessToken: string }> => {
    counter += 1;
    const email = `${EMAIL_PREFIX}-${counter}@example.com`;
    const username = `${USERNAME_PREFIX}${counter}`;

    await request(app.getHttpServer())
      .post(REGISTER_URL)
      .send({ email, username, password: PASSWORD })
      .expect(201);

    const user = await prisma.user.update({
      where: { email },
      data: { accountStatus: AccountStatus.ACTIVE, role },
      select: { id: true },
    });

    const response = await request(app.getHttpServer())
      .post(LOGIN_URL)
      .send({ email, password: PASSWORD })
      .expect(200);

    const body = response.body as { accessToken: string };
    return { email, userId: user.id, accessToken: body.accessToken };
  };

  const get = async (
    url: string,
    token: string | undefined,
    expectedStatus: number,
  ): Promise<Record<string, unknown>> => {
    let call = request(app.getHttpServer()).get(url);
    if (token !== undefined) {
      call = call.set('Authorization', `Bearer ${token}`);
    }
    const response = await call.expect(expectedStatus);
    return response.body as Record<string, unknown>;
  };

  /** Strips volatile envelope fields so error bodies can be compared. */
  const comparableError = (
    body: Record<string, unknown>,
  ): Record<string, unknown> => {
    const rest = { ...body };
    delete rest.timestamp;
    return rest;
  };

  const removeTestAccounts = async (): Promise<void> => {
    await prisma.user.deleteMany({
      where: { email: { startsWith: EMAIL_PREFIX } },
    });
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [AuthorizationProbeController],
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
    const jwtConfig = configService.get('jwt', { infer: true });
    accessSecret = jwtConfig.accessSecret;
    refreshSecret = jwtConfig.refreshSecret;

    await removeTestAccounts();
  });

  afterAll(async () => {
    await removeTestAccounts();
    await app.close();
  });

  describe('admin-only route', () => {
    it('allows an administrator', async () => {
      const admin = await registerAccount(UserRole.ADMIN);

      const body = await get(ADMIN_URL, admin.accessToken, 200);

      expect(body).toEqual({ scope: 'admin' });
    });

    it('rejects a regular user with 403 Forbidden', async () => {
      const user = await registerAccount(UserRole.USER);

      const body = await get(ADMIN_URL, user.accessToken, 403);

      expect(comparableError(body)).toEqual({
        statusCode: 403,
        message: 'Forbidden',
      });
    });

    it('rejects a missing token with 401, not 403', async () => {
      await get(ADMIN_URL, undefined, 401);
    });

    it('rejects a malformed token with 401', async () => {
      await get(ADMIN_URL, 'not-a-jwt', 401);
    });

    it('rejects an expired token with 401', async () => {
      const user = await registerAccount(UserRole.ADMIN);
      const expired = jwt.sign(
        { sub: user.userId, email: user.email, role: UserRole.ADMIN },
        accessSecret,
        { expiresIn: '-1s' },
      );

      await get(ADMIN_URL, expired, 401);
    });

    it('rejects a token signed with the wrong secret with 401', async () => {
      const user = await registerAccount(UserRole.ADMIN);
      const forged = jwt.sign(
        { sub: user.userId, email: user.email, role: UserRole.ADMIN },
        refreshSecret,
        { expiresIn: '5m' },
      );

      await get(ADMIN_URL, forged, 401);
    });

    it('ignores a forged ADMIN role claim — the database role decides', async () => {
      const user = await registerAccount(UserRole.USER);
      // Correct secret, real user — but the role claim lies.
      const forged = jwt.sign(
        { sub: user.userId, email: user.email, role: UserRole.ADMIN },
        accessSecret,
        { expiresIn: '5m' },
      );

      await get(ADMIN_URL, forged, 403);
    });

    it('honors a role change immediately, within an already-issued token', async () => {
      const account = await registerAccount(UserRole.USER);

      await get(ADMIN_URL, account.accessToken, 403);

      await prisma.user.update({
        where: { id: account.userId },
        data: { role: UserRole.ADMIN },
      });
      await get(ADMIN_URL, account.accessToken, 200);

      await prisma.user.update({
        where: { id: account.userId },
        data: { role: UserRole.USER },
      });
      await get(ADMIN_URL, account.accessToken, 403);
    });

    it.each([
      ['a suspended', AccountStatus.SUSPENDED],
      ['a deleted', AccountStatus.DELETED],
      ['a pending verification', AccountStatus.PENDING_VERIFICATION],
    ])(
      'rejects %s administrator with 401, revoking access mid-token-lifetime',
      async (_name, status) => {
        const admin = await registerAccount(UserRole.ADMIN);
        await prisma.user.update({
          where: { id: admin.userId },
          data: { accountStatus: status },
        });

        await get(ADMIN_URL, admin.accessToken, 401);
      },
    );
  });

  describe('authenticated route', () => {
    it('allows a regular user', async () => {
      const user = await registerAccount(UserRole.USER);

      const body = await get(AUTHENTICATED_URL, user.accessToken, 200);

      expect(body).toEqual({ scope: 'authenticated' });
    });

    it('allows an administrator — roles only restrict, never exclude', async () => {
      const admin = await registerAccount(UserRole.ADMIN);

      const body = await get(AUTHENTICATED_URL, admin.accessToken, 200);

      expect(body).toEqual({ scope: 'authenticated' });
    });

    it('rejects a missing token with 401', async () => {
      await get(AUTHENTICATED_URL, undefined, 401);
    });
  });

  describe('public route', () => {
    it('is reachable without any token', async () => {
      const body = await get(PUBLIC_URL, undefined, 200);

      expect(body).toEqual({ scope: 'public' });
    });
  });

  describe('response consistency', () => {
    it('returns identical 401 bodies for missing, malformed, and wrong-secret tokens', async () => {
      const missing = comparableError(await get(ADMIN_URL, undefined, 401));
      const malformed = comparableError(await get(ADMIN_URL, 'garbage', 401));
      const wrongSecret = comparableError(
        await get(
          ADMIN_URL,
          jwt.sign({ sub: 'x' }, refreshSecret, { expiresIn: '5m' }),
          401,
        ),
      );

      expect(malformed).toEqual(missing);
      expect(wrongSecret).toEqual(missing);
    });

    it('security-logs the denial with user id, role, method, and path — never the token', async () => {
      const user = await registerAccount(UserRole.USER);
      const warnSpy = jest
        .spyOn(Logger.prototype, 'warn')
        .mockImplementation(() => undefined);

      try {
        await get(ADMIN_URL, user.accessToken, 403);

        const denial = warnSpy.mock.calls
          .map((call) => String(call[0]))
          .find((message) => message.includes('Authorization denied'));
        expect(denial).toBeDefined();
        expect(denial).toContain(user.userId);
        expect(denial).toContain(UserRole.USER);
        expect(denial).toContain(`GET ${ADMIN_URL}`);
        expect(denial).not.toContain(user.accessToken);
      } finally {
        warnSpy.mockRestore();
      }
    });

    it('keeps the 403 body generic — no role, user, or route details leak', async () => {
      const user = await registerAccount(UserRole.USER);

      const body = await get(ADMIN_URL, user.accessToken, 403);

      expect(body.message).toBe('Forbidden');
      expect(JSON.stringify(body)).not.toContain(user.userId);
      expect(JSON.stringify(body)).not.toContain('ADMIN');
      expect(JSON.stringify(body)).not.toContain('role');
    });
  });
});
