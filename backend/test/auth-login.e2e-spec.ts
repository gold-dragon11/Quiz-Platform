import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AccountStatus, UserRole } from '@prisma/client';
import * as jwt from 'jsonwebtoken';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { AppConfig } from './../src/config/configuration';
import { PrismaService } from './../src/prisma/prisma.service';

/** The documented login success body (docs/04-api/authentication.md §6). */
interface LoginTokens {
  accessToken: string;
  refreshToken: string;
}

/** The error envelope produced by AllExceptionsFilter. */
interface ApiErrorBody {
  statusCode: number;
  message: string | string[];
  error?: string;
  path: string;
  timestamp: string;
  accessToken?: string;
  refreshToken?: string;
}

/**
 * Login end-to-end tests (docs/04-api/authentication.md §6).
 *
 * Accounts are created through the real registration endpoint and then moved
 * into the account status under test, so the fixtures exercise the same data
 * the application writes in production.
 */
describe('Login (e2e)', () => {
  const EMAIL_PREFIX = 'phase33-login';
  const USERNAME_PREFIX = 'phase33login';
  const PASSWORD = 'ValidPass1!';
  const LOGIN_URL = '/api/v1/auth/login';
  const REGISTER_URL = '/api/v1/auth/register';

  let app: INestApplication;
  let prisma: PrismaService;
  let accessSecret: string;
  let refreshSecret: string;
  let counter = 0;

  /** Registers an account and puts it into the requested status. */
  const createAccount = async (
    status: AccountStatus = AccountStatus.ACTIVE,
  ): Promise<{ email: string; username: string; password: string }> => {
    counter += 1;
    const credentials = {
      email: `${EMAIL_PREFIX}-${counter}@example.com`,
      username: `${USERNAME_PREFIX}${counter}`,
      password: PASSWORD,
    };

    await request(app.getHttpServer())
      .post(REGISTER_URL)
      .send(credentials)
      .expect(201);

    // Registration always yields PENDING_VERIFICATION; move it if needed.
    if (status !== AccountStatus.PENDING_VERIFICATION) {
      await prisma.user.update({
        where: { email: credentials.email },
        data: { accountStatus: status },
      });
    }

    return credentials;
  };

  /** Performs a login and returns the typed success body. */
  const login = async (
    email: string,
    password: string,
  ): Promise<LoginTokens> => {
    const response = await request(app.getHttpServer())
      .post(LOGIN_URL)
      .send({ email, password })
      .expect(200);

    return response.body as LoginTokens;
  };

  /** Performs a login expected to fail and returns the typed error body. */
  const failedLogin = async (
    payload: Record<string, unknown>,
    expectedStatus: number,
  ): Promise<ApiErrorBody> => {
    const response = await request(app.getHttpServer())
      .post(LOGIN_URL)
      .send(payload)
      .expect(expectedStatus);

    return response.body as ApiErrorBody;
  };

  /**
   * The parts of an error body that must be identical between two rejected
   * logins. `timestamp` is excluded because it legitimately differs per request.
   */
  const comparableError = (body: ApiErrorBody) => ({
    statusCode: body.statusCode,
    message: body.message,
    error: body.error,
    path: body.path,
  });

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
    const jwtConfig = configService.get('jwt', { infer: true });
    accessSecret = jwtConfig.accessSecret;
    refreshSecret = jwtConfig.refreshSecret;

    await removeTestAccounts();
  });

  afterAll(async () => {
    await removeTestAccounts();
    await app.close();
  });

  describe('successful login', () => {
    it('returns 200 with an access and refresh token', async () => {
      const account = await createAccount(AccountStatus.ACTIVE);

      const tokens = await login(account.email, account.password);

      expect(typeof tokens.accessToken).toBe('string');
      expect(typeof tokens.refreshToken).toBe('string');
      expect(tokens.accessToken.length).toBeGreaterThan(0);
      expect(tokens.refreshToken.length).toBeGreaterThan(0);
    });

    it('returns only the two documented fields and no user object', async () => {
      const account = await createAccount(AccountStatus.ACTIVE);

      const tokens = await login(account.email, account.password);

      expect(Object.keys(tokens).sort()).toEqual([
        'accessToken',
        'refreshToken',
      ]);
      expect(tokens).not.toHaveProperty('user');
    });

    it('never exposes the password hash or the password', async () => {
      const account = await createAccount(AccountStatus.ACTIVE);

      const tokens = await login(account.email, account.password);

      const serialized = JSON.stringify(tokens);
      expect(serialized).not.toContain('argon2');
      expect(serialized).not.toContain('passwordHash');
      expect(serialized).not.toContain(account.password);
    });

    it('accepts the email in any casing', async () => {
      const account = await createAccount(AccountStatus.ACTIVE);

      const tokens = await login(account.email.toUpperCase(), account.password);

      expect(typeof tokens.accessToken).toBe('string');
    });

    it('records the successful login timestamp', async () => {
      const account = await createAccount(AccountStatus.ACTIVE);

      const before = await prisma.user.findUnique({
        where: { email: account.email },
        select: { lastLoginAt: true },
      });
      expect(before?.lastLoginAt).toBeNull();

      await login(account.email, account.password);

      const after = await prisma.user.findUnique({
        where: { email: account.email },
        select: { lastLoginAt: true },
      });
      expect(after?.lastLoginAt).toBeInstanceOf(Date);
    });
  });

  describe('token contents and signing', () => {
    it('signs the access token with the access secret and the documented claims', async () => {
      const account = await createAccount(AccountStatus.ACTIVE);

      const tokens = await login(account.email, account.password);
      const payload = jwt.verify(
        tokens.accessToken,
        accessSecret,
      ) as jwt.JwtPayload;

      const user = await prisma.user.findUnique({
        where: { email: account.email },
        select: { id: true },
      });

      expect(payload.sub).toBe(user?.id);
      expect(payload.email).toBe(account.email);
      expect(payload.role).toBe(UserRole.USER);
      // Only the documented claims plus the standard iat/exp.
      expect(Object.keys(payload).sort()).toEqual([
        'email',
        'exp',
        'iat',
        'role',
        'sub',
      ]);
    });

    it('signs the refresh token with the refresh secret', async () => {
      const account = await createAccount(AccountStatus.ACTIVE);

      const tokens = await login(account.email, account.password);
      const payload = jwt.verify(
        tokens.refreshToken,
        refreshSecret,
      ) as jwt.JwtPayload;

      expect(payload.sub).toBeDefined();
      expect(payload.email).toBe(account.email);
    });

    it('does not accept the access token under the refresh secret', async () => {
      const account = await createAccount(AccountStatus.ACTIVE);

      const tokens = await login(account.email, account.password);

      expect(() => jwt.verify(tokens.accessToken, refreshSecret)).toThrow();
    });

    it('does not accept the refresh token under the access secret', async () => {
      const account = await createAccount(AccountStatus.ACTIVE);

      const tokens = await login(account.email, account.password);

      expect(() => jwt.verify(tokens.refreshToken, accessSecret)).toThrow();
    });

    it('gives the refresh token a longer lifetime than the access token', async () => {
      const account = await createAccount(AccountStatus.ACTIVE);

      const tokens = await login(account.email, account.password);
      const access = jwt.verify(
        tokens.accessToken,
        accessSecret,
      ) as jwt.JwtPayload;
      const refresh = jwt.verify(
        tokens.refreshToken,
        refreshSecret,
      ) as jwt.JwtPayload;

      expect(refresh.exp).toBeGreaterThan(access.exp as number);
    });
  });

  describe('rejected credentials', () => {
    it('rejects a wrong password with a generic 401', async () => {
      const account = await createAccount(AccountStatus.ACTIVE);

      const body = await failedLogin(
        { email: account.email, password: 'WrongPass1!' },
        401,
      );

      expect(body.message).toBe('Invalid email or password.');
    });

    it('rejects an unknown email with the identical 401', async () => {
      const body = await failedLogin(
        { email: `${EMAIL_PREFIX}-nobody@example.com`, password: PASSWORD },
        401,
      );

      expect(body.message).toBe('Invalid email or password.');
    });

    it('returns identical bodies for a wrong password and an unknown email', async () => {
      const account = await createAccount(AccountStatus.ACTIVE);

      const wrongPassword = await failedLogin(
        { email: account.email, password: 'WrongPass1!' },
        401,
      );
      const unknownEmail = await failedLogin(
        { email: `${EMAIL_PREFIX}-ghost@example.com`, password: PASSWORD },
        401,
      );

      expect(comparableError(wrongPassword)).toEqual(
        comparableError(unknownEmail),
      );
    });

    it('never reveals that a deleted account existed', async () => {
      const account = await createAccount(AccountStatus.DELETED);

      const deletedLogin = await failedLogin(
        { email: account.email, password: account.password },
        401,
      );
      const unknownEmail = await failedLogin(
        {
          email: `${EMAIL_PREFIX}-never-existed@example.com`,
          password: PASSWORD,
        },
        401,
      );

      expect(deletedLogin.message).toBe('Invalid email or password.');
      expect(comparableError(deletedLogin)).toEqual(
        comparableError(unknownEmail),
      );
    });

    it('issues no tokens when credentials are rejected', async () => {
      const body = await failedLogin(
        { email: `${EMAIL_PREFIX}-none@example.com`, password: PASSWORD },
        401,
      );

      expect(body.accessToken).toBeUndefined();
      expect(body.refreshToken).toBeUndefined();
    });
  });

  describe('account status', () => {
    it('rejects a pending verification account with 403', async () => {
      const account = await createAccount(AccountStatus.PENDING_VERIFICATION);

      const body = await failedLogin(
        { email: account.email, password: account.password },
        403,
      );

      expect(body.message).toBe('Email not verified.');
      expect(body.accessToken).toBeUndefined();
    });

    it('rejects a suspended account with 403', async () => {
      const account = await createAccount(AccountStatus.SUSPENDED);

      const body = await failedLogin(
        { email: account.email, password: account.password },
        403,
      );

      expect(body.message).toBe('Account suspended.');
      expect(body.accessToken).toBeUndefined();
    });

    it('does not record a login timestamp for a rejected account', async () => {
      const account = await createAccount(AccountStatus.SUSPENDED);

      await failedLogin(
        { email: account.email, password: account.password },
        403,
      );

      const user = await prisma.user.findUnique({
        where: { email: account.email },
        select: { lastLoginAt: true },
      });

      expect(user?.lastLoginAt).toBeNull();
    });
  });

  describe('validation', () => {
    const invalidCases: {
      name: string;
      payload: Record<string, unknown>;
    }[] = [
      {
        name: 'a malformed email',
        payload: { email: 'not-an-email', password: PASSWORD },
      },
      { name: 'a missing email', payload: { password: PASSWORD } },
      {
        name: 'a missing password',
        payload: { email: `${EMAIL_PREFIX}-x@example.com` },
      },
      { name: 'an empty email', payload: { email: '', password: PASSWORD } },
      {
        name: 'an empty password',
        payload: { email: `${EMAIL_PREFIX}-x@example.com`, password: '' },
      },
      { name: 'an empty body', payload: {} },
      {
        name: 'an unknown extra field',
        payload: {
          email: `${EMAIL_PREFIX}-x@example.com`,
          password: PASSWORD,
          role: 'ADMIN',
        },
      },
      {
        name: 'a non-string password',
        payload: { email: `${EMAIL_PREFIX}-x@example.com`, password: 12345 },
      },
    ];

    it.each(invalidCases)('rejects $name with 400', async ({ payload }) => {
      await failedLogin(payload, 400);
    });

    it('does not apply registration password complexity rules at login', async () => {
      // A short password must fail authentication (401), not validation (400) —
      // otherwise the endpoint would leak the password policy.
      await failedLogin(
        { email: `${EMAIL_PREFIX}-weak@example.com`, password: 'short' },
        401,
      );
    });
  });
});
