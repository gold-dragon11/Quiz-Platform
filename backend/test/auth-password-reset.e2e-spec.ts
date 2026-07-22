import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AccountStatus } from '@prisma/client';
import * as jwt from 'jsonwebtoken';
import { createHmac } from 'node:crypto';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PASSWORD_RESET_PURPOSE } from './../src/auth/constants/auth.constants';
import { AppConfig } from './../src/config/configuration';
import { EmailService } from './../src/email/email.service';
import { PrismaService } from './../src/prisma/prisma.service';

/** One captured outbound email. */
interface CapturedEmail {
  recipient: string;
  url: string;
}

/** Test double capturing both email kinds so the suite drives the real flow. */
class CapturingEmailService extends EmailService {
  readonly resetEmails: CapturedEmail[] = [];

  sendVerificationEmail(): Promise<void> {
    return Promise.resolve();
  }

  sendPasswordResetEmail(recipient: string, resetUrl: string): Promise<void> {
    this.resetEmails.push({ recipient, url: resetUrl });
    return Promise.resolve();
  }

  lastResetFor(recipient: string): CapturedEmail | undefined {
    return [...this.resetEmails]
      .reverse()
      .find((e) => e.recipient === recipient);
  }
}

const tokenFromUrl = (url: string): string =>
  new URL(url).searchParams.get('token') ?? '';

/**
 * Password reset end-to-end tests (docs/04-api/authentication.md §9-10).
 */
describe('Password Reset (e2e)', () => {
  const EMAIL_PREFIX = 'phase37-pr';
  const USERNAME_PREFIX = 'phase37pr';
  const PASSWORD = 'ValidPass1!';
  const NEW_PASSWORD = 'NewValid2@';
  const REGISTER_URL = '/api/v1/auth/register';
  const LOGIN_URL = '/api/v1/auth/login';
  const FORGOT_URL = '/api/v1/auth/forgot-password';
  const RESET_URL = '/api/v1/auth/reset-password';
  const REFRESH_URL = '/api/v1/auth/refresh';
  const GENERIC_ERROR = 'Invalid or expired reset token.';

  let app: INestApplication;
  let prisma: PrismaService;
  let emailOutbox: CapturingEmailService;
  let resetSecret: string;
  let accessSecret: string;
  let verificationSecret: string;
  let frontendUrl: string;
  let counter = 0;

  const registerActiveAccount = async (): Promise<{
    email: string;
    username: string;
    userId: string;
  }> => {
    counter += 1;
    const email = `${EMAIL_PREFIX}-${counter}@example.com`;
    const username = `${USERNAME_PREFIX}${counter}`;

    await request(app.getHttpServer())
      .post(REGISTER_URL)
      .send({ email, username, password: PASSWORD })
      .expect(201);

    const user = await prisma.user.update({
      where: { email },
      data: { accountStatus: AccountStatus.ACTIVE },
      select: { id: true },
    });

    return { email, username, userId: user.id };
  };

  const forgot = async (email: string): Promise<Record<string, unknown>> => {
    const response = await request(app.getHttpServer())
      .post(FORGOT_URL)
      .send({ email })
      .expect(202);

    return response.body as Record<string, unknown>;
  };

  const requestResetToken = async (email: string): Promise<string> => {
    await forgot(email);
    return tokenFromUrl(emailOutbox.lastResetFor(email)!.url);
  };

  const reset = async (
    payload: Record<string, unknown>,
    expectedStatus: number,
  ): Promise<Record<string, unknown>> => {
    const response = await request(app.getHttpServer())
      .post(RESET_URL)
      .send(payload)
      .expect(expectedStatus);

    return response.body as Record<string, unknown>;
  };

  const login = async (
    email: string,
    password: string,
    expectedStatus: number,
  ): Promise<Record<string, unknown>> => {
    const response = await request(app.getHttpServer())
      .post(LOGIN_URL)
      .send({ email, password })
      .expect(expectedStatus);

    return response.body as Record<string, unknown>;
  };

  /** Mirrors the service's fingerprint derivation for forging test tokens. */
  const fingerprintOf = (passwordHash: string): string =>
    createHmac('sha256', resetSecret)
      .update(passwordHash)
      .digest('hex')
      .slice(0, 16);

  const passwordHashOf = async (userId: string): Promise<string> => {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });
    return user!.passwordHash;
  };

  const removeTestAccounts = async (): Promise<void> => {
    await prisma.user.deleteMany({
      where: { email: { startsWith: EMAIL_PREFIX } },
    });
  };

  beforeAll(async () => {
    emailOutbox = new CapturingEmailService();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(EmailService)
      .useValue(emailOutbox)
      .compile();

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
    resetSecret = configService.get('passwordReset', { infer: true }).secret;
    accessSecret = configService.get('jwt', { infer: true }).accessSecret;
    verificationSecret = configService.get('emailVerification', {
      infer: true,
    }).secret;
    frontendUrl = configService.get('frontendUrl', { infer: true });

    await removeTestAccounts();
  });

  afterAll(async () => {
    await removeTestAccounts();
    await app.close();
  });

  describe('POST /auth/forgot-password', () => {
    it('sends a reset email for an active account, linking the frontend reset route', async () => {
      const account = await registerActiveAccount();

      const body = await forgot(account.email);

      expect(body).toEqual({});
      const email = emailOutbox.lastResetFor(account.email);
      expect(email).toBeDefined();
      expect(
        email!.url.startsWith(`${frontendUrl}/reset-password?token=`),
      ).toBe(true);
    });

    it('signs the token with the dedicated reset secret, purpose, and fingerprint', async () => {
      const account = await registerActiveAccount();
      const token = await requestResetToken(account.email);

      const payload = jwt.verify(token, resetSecret) as jwt.JwtPayload;
      expect(payload.sub).toBe(account.userId);
      expect(payload.purpose).toBe(PASSWORD_RESET_PURPOSE);
      expect(payload.pwd).toBe(
        fingerprintOf(await passwordHashOf(account.userId)),
      );

      // Never valid under any other secret.
      expect(() => jwt.verify(token, accessSecret)).toThrow();
      expect(() => jwt.verify(token, verificationSecret)).toThrow();
    });

    it.each([
      ['a pending verification account', AccountStatus.PENDING_VERIFICATION],
      ['a suspended account', AccountStatus.SUSPENDED],
      ['a deleted account', AccountStatus.DELETED],
    ])('answers 202 for %s and sends nothing', async (_name, status) => {
      const account = await registerActiveAccount();
      await prisma.user.update({
        where: { id: account.userId },
        data: { accountStatus: status },
      });

      const sentBefore = emailOutbox.resetEmails.length;
      const body = await forgot(account.email);

      expect(body).toEqual({});
      expect(emailOutbox.resetEmails.length).toBe(sentBefore);
    });

    it('answers 202 for an unknown email and sends nothing', async () => {
      const sentBefore = emailOutbox.resetEmails.length;

      const body = await forgot(`${EMAIL_PREFIX}-nobody@example.com`);

      expect(body).toEqual({});
      expect(emailOutbox.resetEmails.length).toBe(sentBefore);
    });

    it('normalizes the email before matching the account', async () => {
      const account = await registerActiveAccount();
      const sentBefore = emailOutbox.resetEmails.length;

      await forgot(account.email.toUpperCase());

      expect(emailOutbox.resetEmails.length).toBe(sentBefore + 1);
    });

    it('rejects an invalid email format with 400', async () => {
      await request(app.getHttpServer())
        .post(FORGOT_URL)
        .send({ email: 'not-an-email' })
        .expect(400);
    });

    it('rejects a missing email field with 400', async () => {
      await request(app.getHttpServer()).post(FORGOT_URL).send({}).expect(400);
    });
  });

  describe('successful reset', () => {
    it('changes the password: 200 empty body, new password logs in, old is rejected', async () => {
      const account = await registerActiveAccount();
      const token = await requestResetToken(account.email);

      const body = await reset({ token, newPassword: NEW_PASSWORD }, 200);
      expect(body).toEqual({});

      await login(account.email, NEW_PASSWORD, 200);
      const rejected = await login(account.email, PASSWORD, 401);
      expect(rejected.message).toBe('Invalid email or password.');
    });

    it('stores a fresh Argon2id hash, never the plaintext', async () => {
      const account = await registerActiveAccount();
      const oldHash = await passwordHashOf(account.userId);
      const token = await requestResetToken(account.email);

      await reset({ token, newPassword: NEW_PASSWORD }, 200);

      const newHash = await passwordHashOf(account.userId);
      expect(newHash).toMatch(/^\$argon2id\$/);
      expect(newHash).not.toBe(oldHash);
      expect(newHash).not.toContain(NEW_PASSWORD);
    });

    it('revokes every refresh session the user holds', async () => {
      const account = await registerActiveAccount();

      // Two devices log in.
      const first = (await login(account.email, PASSWORD, 200)) as {
        refreshToken: string;
      };
      const second = (await login(account.email, PASSWORD, 200)) as {
        refreshToken: string;
      };

      const token = await requestResetToken(account.email);
      await reset({ token, newPassword: NEW_PASSWORD }, 200);

      const active = await prisma.refreshToken.count({
        where: { userId: account.userId, revokedAt: null },
      });
      expect(active).toBe(0);

      await request(app.getHttpServer())
        .post(REFRESH_URL)
        .send({ refreshToken: first.refreshToken })
        .expect(401);
      await request(app.getHttpServer())
        .post(REFRESH_URL)
        .send({ refreshToken: second.refreshToken })
        .expect(401);
    });

    it('keeps the account active and preserves profile, settings, and statistics', async () => {
      const account = await registerActiveAccount();
      const token = await requestResetToken(account.email);

      await reset({ token, newPassword: NEW_PASSWORD }, 200);

      const user = await prisma.user.findUnique({
        where: { id: account.userId },
        include: { profile: true, settings: true, statistics: true },
      });

      expect(user?.accountStatus).toBe(AccountStatus.ACTIVE);
      expect(user?.profile?.displayName).toBe(account.username);
      expect(user?.settings).not.toBeNull();
      expect(user?.statistics?.totalQuizzes).toBe(0);
    });
  });

  describe('single use and replay protection', () => {
    it('rejects the token once it has been used', async () => {
      const account = await registerActiveAccount();
      const token = await requestResetToken(account.email);

      await reset({ token, newPassword: NEW_PASSWORD }, 200);
      const body = await reset({ token, newPassword: 'Another3#x' }, 400);

      expect(body.message).toBe(GENERIC_ERROR);
      // The replay changed nothing: NEW_PASSWORD still logs in.
      await login(account.email, NEW_PASSWORD, 200);
    });

    it('invalidates every earlier token once any reset succeeds', async () => {
      const account = await registerActiveAccount();
      const earlierToken = await requestResetToken(account.email);
      const laterToken = await requestResetToken(account.email);

      await reset({ token: laterToken, newPassword: NEW_PASSWORD }, 200);

      const body = await reset(
        { token: earlierToken, newPassword: 'Another3#x' },
        400,
      );
      expect(body.message).toBe(GENERIC_ERROR);
    });
  });

  describe('rejected tokens', () => {
    it('rejects a malformed token', async () => {
      const body = await reset(
        { token: 'not-a-jwt', newPassword: NEW_PASSWORD },
        400,
      );
      expect(body.message).toBe(GENERIC_ERROR);
    });

    it('rejects an expired token', async () => {
      const account = await registerActiveAccount();
      const expired = jwt.sign(
        {
          sub: account.userId,
          purpose: PASSWORD_RESET_PURPOSE,
          pwd: fingerprintOf(await passwordHashOf(account.userId)),
        },
        resetSecret,
        { expiresIn: '-1s' },
      );

      const body = await reset(
        { token: expired, newPassword: NEW_PASSWORD },
        400,
      );
      expect(body.message).toBe(GENERIC_ERROR);
    });

    it('rejects a token signed with the wrong secret', async () => {
      const account = await registerActiveAccount();
      const forged = jwt.sign(
        {
          sub: account.userId,
          purpose: PASSWORD_RESET_PURPOSE,
          pwd: fingerprintOf(await passwordHashOf(account.userId)),
        },
        verificationSecret,
        { expiresIn: '1h' },
      );

      const body = await reset(
        { token: forged, newPassword: NEW_PASSWORD },
        400,
      );
      expect(body.message).toBe(GENERIC_ERROR);
    });

    it('rejects a token with the wrong purpose', async () => {
      const account = await registerActiveAccount();
      const wrongPurpose = jwt.sign(
        {
          sub: account.userId,
          purpose: 'email_verification',
          pwd: fingerprintOf(await passwordHashOf(account.userId)),
        },
        resetSecret,
        { expiresIn: '1h' },
      );

      const body = await reset(
        { token: wrongPurpose, newPassword: NEW_PASSWORD },
        400,
      );
      expect(body.message).toBe(GENERIC_ERROR);
    });

    it('rejects a token without the fingerprint claim', async () => {
      const account = await registerActiveAccount();
      const fingerprintless = jwt.sign(
        { sub: account.userId, purpose: PASSWORD_RESET_PURPOSE },
        resetSecret,
        { expiresIn: '1h' },
      );

      const body = await reset(
        { token: fingerprintless, newPassword: NEW_PASSWORD },
        400,
      );
      expect(body.message).toBe(GENERIC_ERROR);
    });

    it('rejects a token with a wrong fingerprint', async () => {
      const account = await registerActiveAccount();
      const wrongFingerprint = jwt.sign(
        {
          sub: account.userId,
          purpose: PASSWORD_RESET_PURPOSE,
          pwd: 'deadbeefdeadbeef',
        },
        resetSecret,
        { expiresIn: '1h' },
      );

      const body = await reset(
        { token: wrongFingerprint, newPassword: NEW_PASSWORD },
        400,
      );
      expect(body.message).toBe(GENERIC_ERROR);
    });

    it('rejects a token for a user that does not exist', async () => {
      const ghost = jwt.sign(
        {
          sub: '00000000-0000-4000-8000-000000000077',
          purpose: PASSWORD_RESET_PURPOSE,
          pwd: 'deadbeefdeadbeef',
        },
        resetSecret,
        { expiresIn: '1h' },
      );

      const body = await reset(
        { token: ghost, newPassword: NEW_PASSWORD },
        400,
      );
      expect(body.message).toBe(GENERIC_ERROR);
    });

    it('rejects a valid token once the account is no longer active, leaking nothing', async () => {
      const account = await registerActiveAccount();
      const token = await requestResetToken(account.email);

      await prisma.user.update({
        where: { id: account.userId },
        data: { accountStatus: AccountStatus.SUSPENDED },
      });

      const body = await reset({ token, newPassword: NEW_PASSWORD }, 400);

      expect(body.message).toBe(GENERIC_ERROR);
      expect(JSON.stringify(body)).not.toContain('SUSPENDED');
    });

    it('returns an identical body for every failure mode', async () => {
      const malformed = await reset(
        { token: 'garbage', newPassword: NEW_PASSWORD },
        400,
      );
      const ghost = await reset(
        {
          token: jwt.sign(
            {
              sub: '00000000-0000-4000-8000-000000000077',
              purpose: PASSWORD_RESET_PURPOSE,
              pwd: 'deadbeefdeadbeef',
            },
            resetSecret,
            { expiresIn: '1h' },
          ),
          newPassword: NEW_PASSWORD,
        },
        400,
      );

      const comparable = (body: Record<string, unknown>) => ({
        statusCode: body.statusCode,
        message: body.message,
        error: body.error,
        path: body.path,
      });
      expect(comparable(malformed)).toEqual(comparable(ghost));
    });
  });

  describe('password validation', () => {
    it.each([
      ['a password under 8 characters', 'Ab1!'],
      ['a password without an uppercase letter', 'lowercase1!'],
      ['a password without a lowercase letter', 'UPPERCASE1!'],
      ['a password without a number', 'NoDigitsHere!'],
      ['a password without a special character', 'NoSpecial123'],
    ])('rejects %s with 400', async (_name, weakPassword) => {
      const account = await registerActiveAccount();
      const token = await requestResetToken(account.email);

      await reset({ token, newPassword: weakPassword }, 400);

      // A failed validation must not consume the token.
      await reset({ token, newPassword: NEW_PASSWORD }, 200);
    });

    it('produces byte-identical validation messages to Registration', async () => {
      const account = await registerActiveAccount();
      const token = await requestResetToken(account.email);

      // Same weak password through both endpoints — the shared IsValidPassword
      // decorator must yield exactly the same message list.
      const resetBody = await reset({ token, newPassword: 'weak' }, 400);
      const registerResponse = await request(app.getHttpServer())
        .post(REGISTER_URL)
        .send({
          email: `${EMAIL_PREFIX}-msgs@example.com`,
          username: `${USERNAME_PREFIX}msgs`,
          password: 'weak',
        })
        .expect(400);

      expect(resetBody.message).toEqual(
        (registerResponse.body as { message: string[] }).message,
      );
    });

    it('rejects a missing token field with 400', async () => {
      await request(app.getHttpServer())
        .post(RESET_URL)
        .send({ newPassword: NEW_PASSWORD })
        .expect(400);
    });

    it('rejects a missing newPassword field with 400', async () => {
      await request(app.getHttpServer())
        .post(RESET_URL)
        .send({ token: 'anything' })
        .expect(400);
    });
  });

  describe('leakage', () => {
    it('never includes tokens, passwords, or hashes in any response', async () => {
      const account = await registerActiveAccount();
      const token = await requestResetToken(account.email);

      const forgotBody = await forgot(account.email);
      const successBody = await reset(
        { token, newPassword: NEW_PASSWORD },
        200,
      );
      const failureBody = await reset(
        { token, newPassword: 'Another3#x' },
        400,
      );
      const hash = await passwordHashOf(account.userId);

      for (const body of [forgotBody, successBody, failureBody]) {
        const serialized = JSON.stringify(body);
        expect(serialized).not.toContain(token);
        expect(serialized).not.toContain(NEW_PASSWORD);
        expect(serialized).not.toContain(PASSWORD);
        expect(serialized).not.toContain(hash);
      }
    });
  });
});
