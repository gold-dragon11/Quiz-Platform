import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AccountStatus } from '@prisma/client';
import * as jwt from 'jsonwebtoken';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { EMAIL_VERIFICATION_PURPOSE } from './../src/auth/constants/auth.constants';
import { AppConfig } from './../src/config/configuration';
import { EmailService } from './../src/email/email.service';
import { PrismaService } from './../src/prisma/prisma.service';

/** One captured outbound email. */
interface CapturedEmail {
  recipient: string;
  verificationUrl: string;
}

/**
 * Test double standing in for the email provider: records every send so the
 * suite can drive the real end-to-end flow — register, receive the email,
 * follow the link, verify.
 */
class CapturingEmailService extends EmailService {
  readonly sent: CapturedEmail[] = [];

  sendVerificationEmail(
    recipient: string,
    verificationUrl: string,
  ): Promise<void> {
    this.sent.push({ recipient, verificationUrl });
    return Promise.resolve();
  }

  // Required by the abstraction; this suite never sends reset emails.
  sendPasswordResetEmail(): Promise<void> {
    return Promise.resolve();
  }

  lastFor(recipient: string): CapturedEmail | undefined {
    return [...this.sent].reverse().find((e) => e.recipient === recipient);
  }
}

/** Extracts the token from a captured `/verify-email?token=...` link. */
const tokenFromUrl = (verificationUrl: string): string => {
  const url = new URL(verificationUrl);
  return url.searchParams.get('token') ?? '';
};

/**
 * Email verification end-to-end tests (docs/04-api/authentication.md §5).
 */
describe('Email Verification (e2e)', () => {
  const EMAIL_PREFIX = 'phase36-ev';
  const USERNAME_PREFIX = 'phase36ev';
  const PASSWORD = 'ValidPass1!';
  const REGISTER_URL = '/api/v1/auth/register';
  const LOGIN_URL = '/api/v1/auth/login';
  const VERIFY_URL = '/api/v1/auth/verify-email';
  const RESEND_URL = '/api/v1/auth/resend-verification';
  const GENERIC_ERROR = 'Invalid or expired verification token.';

  let app: INestApplication;
  let prisma: PrismaService;
  let emailOutbox: CapturingEmailService;
  let verificationSecret: string;
  let accessSecret: string;
  let frontendUrl: string;
  let counter = 0;

  const registerAccount = async (): Promise<{
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

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    return { email, username, userId: user!.id };
  };

  const verify = async (
    token: string,
    expectedStatus: number,
  ): Promise<Record<string, unknown>> => {
    const response = await request(app.getHttpServer())
      .post(VERIFY_URL)
      .send({ token })
      .expect(expectedStatus);

    return response.body as Record<string, unknown>;
  };

  const accountState = async (
    userId: string,
  ): Promise<{ emailVerified: boolean; accountStatus: AccountStatus }> => {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { emailVerified: true, accountStatus: true },
    });
    return user!;
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
    verificationSecret = configService.get('emailVerification', {
      infer: true,
    }).secret;
    accessSecret = configService.get('jwt', { infer: true }).accessSecret;
    frontendUrl = configService.get('frontendUrl', { infer: true });

    await removeTestAccounts();
  });

  afterAll(async () => {
    await removeTestAccounts();
    await app.close();
  });

  describe('registration integration', () => {
    it('sends a verification email pointing at the frontend verify route', async () => {
      const account = await registerAccount();

      const email = emailOutbox.lastFor(account.email);
      expect(email).toBeDefined();
      expect(
        email!.verificationUrl.startsWith(`${frontendUrl}/verify-email?token=`),
      ).toBe(true);
      expect(tokenFromUrl(email!.verificationUrl).length).toBeGreaterThan(0);
    });

    it('signs the emailed token with the dedicated verification secret and purpose claim', async () => {
      const account = await registerAccount();
      const token = tokenFromUrl(
        emailOutbox.lastFor(account.email)!.verificationUrl,
      );

      const payload = jwt.verify(token, verificationSecret) as jwt.JwtPayload;
      expect(payload.sub).toBe(account.userId);
      expect(payload.purpose).toBe(EMAIL_VERIFICATION_PURPOSE);

      // Not valid under the access secret — can never act as a login token.
      expect(() => jwt.verify(token, accessSecret)).toThrow();
    });
  });

  describe('successful verification', () => {
    it('activates the account: 200 empty body, emailVerified true, status ACTIVE', async () => {
      const account = await registerAccount();

      expect(await accountState(account.userId)).toEqual({
        emailVerified: false,
        accountStatus: AccountStatus.PENDING_VERIFICATION,
      });

      const token = tokenFromUrl(
        emailOutbox.lastFor(account.email)!.verificationUrl,
      );
      const body = await verify(token, 200);

      expect(body).toEqual({});
      expect(await accountState(account.userId)).toEqual({
        emailVerified: true,
        accountStatus: AccountStatus.ACTIVE,
      });
    });

    it('login is blocked before verification and works after', async () => {
      const account = await registerAccount();

      // docs/04-api/authentication.md §6: 403 Email not verified.
      const blocked = await request(app.getHttpServer())
        .post(LOGIN_URL)
        .send({ email: account.email, password: PASSWORD })
        .expect(403);
      expect((blocked.body as { message: string }).message).toBe(
        'Email not verified.',
      );

      const token = tokenFromUrl(
        emailOutbox.lastFor(account.email)!.verificationUrl,
      );
      await verify(token, 200);

      await request(app.getHttpServer())
        .post(LOGIN_URL)
        .send({ email: account.email, password: PASSWORD })
        .expect(200);
    });
  });

  describe('rejected tokens', () => {
    it('rejects a malformed token with the generic 400', async () => {
      const body = await verify('not-a-jwt', 400);
      expect(body.message).toBe(GENERIC_ERROR);
    });

    it('rejects a token signed with the wrong secret', async () => {
      const account = await registerAccount();
      const forged = jwt.sign(
        { sub: account.userId, purpose: EMAIL_VERIFICATION_PURPOSE },
        accessSecret,
        { expiresIn: '24h' },
      );

      const body = await verify(forged, 400);
      expect(body.message).toBe(GENERIC_ERROR);
    });

    it('rejects an expired token', async () => {
      const account = await registerAccount();
      const expired = jwt.sign(
        { sub: account.userId, purpose: EMAIL_VERIFICATION_PURPOSE },
        verificationSecret,
        { expiresIn: '-1s' },
      );

      const body = await verify(expired, 400);
      expect(body.message).toBe(GENERIC_ERROR);
    });

    it('rejects a token without the purpose claim', async () => {
      const account = await registerAccount();
      const purposeless = jwt.sign(
        { sub: account.userId },
        verificationSecret,
        {
          expiresIn: '24h',
        },
      );

      const body = await verify(purposeless, 400);
      expect(body.message).toBe(GENERIC_ERROR);
    });

    it('rejects a token for a user that does not exist', async () => {
      const ghost = jwt.sign(
        {
          sub: '00000000-0000-4000-8000-000000000042',
          purpose: EMAIL_VERIFICATION_PURPOSE,
        },
        verificationSecret,
        { expiresIn: '24h' },
      );

      const body = await verify(ghost, 400);
      expect(body.message).toBe(GENERIC_ERROR);
    });

    it('rejects a replayed token once the account is verified', async () => {
      const account = await registerAccount();
      const token = tokenFromUrl(
        emailOutbox.lastFor(account.email)!.verificationUrl,
      );

      await verify(token, 200);
      const body = await verify(token, 400);

      expect(body.message).toBe(GENERIC_ERROR);
      // The replay changed nothing.
      expect(await accountState(account.userId)).toEqual({
        emailVerified: true,
        accountStatus: AccountStatus.ACTIVE,
      });
    });

    it('rejects a valid token for a suspended account without leaking why', async () => {
      const account = await registerAccount();
      await prisma.user.update({
        where: { id: account.userId },
        data: { accountStatus: AccountStatus.SUSPENDED },
      });

      const token = tokenFromUrl(
        emailOutbox.lastFor(account.email)!.verificationUrl,
      );
      const body = await verify(token, 400);

      expect(body.message).toBe(GENERIC_ERROR);
      expect(JSON.stringify(body)).not.toContain('SUSPENDED');
    });

    it('returns an identical body for every failure mode', async () => {
      const malformed = await verify('garbage', 400);
      const expired = await verify(
        jwt.sign(
          {
            sub: '00000000-0000-4000-8000-000000000042',
            purpose: EMAIL_VERIFICATION_PURPOSE,
          },
          verificationSecret,
          { expiresIn: '-1s' },
        ),
        400,
      );

      const comparable = (body: Record<string, unknown>) => ({
        statusCode: body.statusCode,
        message: body.message,
        error: body.error,
        path: body.path,
      });
      expect(comparable(malformed)).toEqual(comparable(expired));
    });

    it('rejects a missing token field with 400', async () => {
      await request(app.getHttpServer()).post(VERIFY_URL).send({}).expect(400);
    });
  });

  describe('POST /auth/resend-verification', () => {
    it('re-sends for a pending account and the new token verifies', async () => {
      const account = await registerAccount();
      const sentBefore = emailOutbox.sent.length;

      await request(app.getHttpServer())
        .post(RESEND_URL)
        .send({ email: account.email })
        .expect(202)
        .expect((res) => expect(res.body).toEqual({}));

      expect(emailOutbox.sent.length).toBe(sentBefore + 1);

      const token = tokenFromUrl(
        emailOutbox.lastFor(account.email)!.verificationUrl,
      );
      await verify(token, 200);
      expect((await accountState(account.userId)).accountStatus).toBe(
        AccountStatus.ACTIVE,
      );
    });

    it('answers 202 for an unknown email and sends nothing', async () => {
      const sentBefore = emailOutbox.sent.length;

      await request(app.getHttpServer())
        .post(RESEND_URL)
        .send({ email: `${EMAIL_PREFIX}-nobody@example.com` })
        .expect(202);

      expect(emailOutbox.sent.length).toBe(sentBefore);
    });

    it('answers 202 for an already verified account and sends nothing', async () => {
      const account = await registerAccount();
      const token = tokenFromUrl(
        emailOutbox.lastFor(account.email)!.verificationUrl,
      );
      await verify(token, 200);

      const sentBefore = emailOutbox.sent.length;
      await request(app.getHttpServer())
        .post(RESEND_URL)
        .send({ email: account.email })
        .expect(202);

      expect(emailOutbox.sent.length).toBe(sentBefore);
    });

    it('normalizes the email before matching the account', async () => {
      const account = await registerAccount();
      const sentBefore = emailOutbox.sent.length;

      await request(app.getHttpServer())
        .post(RESEND_URL)
        .send({ email: account.email.toUpperCase() })
        .expect(202);

      expect(emailOutbox.sent.length).toBe(sentBefore + 1);
    });

    it('an earlier token still verifies after a resend', async () => {
      // Stateless tokens: docs/04-api/authentication.md §5 — previously issued
      // tokens remain valid until they expire.
      const account = await registerAccount();
      const firstToken = tokenFromUrl(
        emailOutbox.lastFor(account.email)!.verificationUrl,
      );

      await request(app.getHttpServer())
        .post(RESEND_URL)
        .send({ email: account.email })
        .expect(202);

      await verify(firstToken, 200);
    });

    it('rejects an invalid email format with 400', async () => {
      await request(app.getHttpServer())
        .post(RESEND_URL)
        .send({ email: 'not-an-email' })
        .expect(400);
    });

    it('rejects a missing email field with 400', async () => {
      await request(app.getHttpServer()).post(RESEND_URL).send({}).expect(400);
    });
  });

  describe('token leakage', () => {
    it('never includes tokens in any response body', async () => {
      const account = await registerAccount();
      const token = tokenFromUrl(
        emailOutbox.lastFor(account.email)!.verificationUrl,
      );

      const success = await request(app.getHttpServer())
        .post(VERIFY_URL)
        .send({ token })
        .expect(200);
      const failure = await verify(token, 400);
      const resend = await request(app.getHttpServer())
        .post(RESEND_URL)
        .send({ email: account.email })
        .expect(202);

      for (const body of [success.body, failure, resend.body]) {
        expect(JSON.stringify(body)).not.toContain(token);
      }
    });
  });
});
