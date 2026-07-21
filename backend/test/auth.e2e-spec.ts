import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  AccountStatus,
  AvatarType,
  Language,
  Theme,
  UserRole,
} from '@prisma/client';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { DEFAULT_AVATAR_URL } from './../src/common/constants/avatar.constants';
import { PrismaService } from './../src/prisma/prisma.service';

/**
 * Registration end-to-end tests (docs/04-api/authentication.md §4).
 *
 * Every account created here uses the EMAIL_PREFIX / USERNAME_PREFIX markers so
 * the suite can clean up after itself without touching other data.
 */
describe('Registration (e2e)', () => {
  const EMAIL_PREFIX = 'phase32-e2e';
  const USERNAME_PREFIX = 'phase32e2e';
  const VALID_PASSWORD = 'ValidPass1!';

  let app: INestApplication;
  let prisma: PrismaService;
  let counter = 0;

  /** Unique-per-test credentials so cases never collide. */
  const nextCredentials = () => {
    counter += 1;
    return {
      email: `${EMAIL_PREFIX}-${counter}@example.com`,
      username: `${USERNAME_PREFIX}${counter}`,
      password: VALID_PASSWORD,
    };
  };

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

    // Mirror the global pipe and route prefix configured in main.ts so requests
    // behave identically to production.
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
    await removeTestAccounts();
  });

  afterAll(async () => {
    await removeTestAccounts();
    await app.close();
  });

  describe('POST /auth/register', () => {
    it('creates the account and all four owned records atomically', async () => {
      const credentials = nextCredentials();

      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(credentials)
        .expect(201);

      const user = await prisma.user.findUnique({
        where: { email: credentials.email },
        include: {
          profile: true,
          avatar: true,
          settings: true,
          statistics: true,
        },
      });

      expect(user).not.toBeNull();

      // User defaults (docs/01-prd/authentication.md §3).
      expect(user?.emailVerified).toBe(false);
      expect(user?.accountStatus).toBe(AccountStatus.PENDING_VERIFICATION);
      expect(user?.role).toBe(UserRole.USER);

      // Profile: displayName is initialized to the username.
      expect(user?.profile?.username).toBe(credentials.username);
      expect(user?.profile?.displayName).toBe(credentials.username);
      expect(user?.profile?.bio).toBeNull();

      // Avatar: predefined, using the shared default asset.
      expect(user?.avatar?.type).toBe(AvatarType.PREDEFINED);
      expect(user?.avatar?.imageUrl).toBe(DEFAULT_AVATAR_URL);

      // Settings defaults.
      expect(user?.settings?.language).toBe(Language.ENGLISH);
      expect(user?.settings?.theme).toBe(Theme.DARK);
      expect(user?.settings?.publicProfileEnabled).toBe(true);

      // Statistics start at zero.
      expect(user?.statistics?.totalQuizzes).toBe(0);
      expect(user?.statistics?.totalQuestions).toBe(0);
      expect(user?.statistics?.totalXP).toBe(0);
    });

    it('stores an Argon2 hash rather than the plaintext password', async () => {
      const credentials = nextCredentials();

      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(credentials)
        .expect(201);

      const user = await prisma.user.findUnique({
        where: { email: credentials.email },
        select: { passwordHash: true },
      });

      expect(user?.passwordHash).toBeDefined();
      expect(user?.passwordHash).not.toBe(credentials.password);
      expect(user?.passwordHash).toMatch(/^\$argon2id\$/);
    });

    it('never returns the password hash in the response body', async () => {
      const credentials = nextCredentials();

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(credentials)
        .expect(201);

      expect(JSON.stringify(response.body)).not.toContain('argon2');
      expect(JSON.stringify(response.body)).not.toContain(credentials.password);
    });

    it('applies the requested preferred language', async () => {
      const credentials = nextCredentials();

      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ ...credentials, preferredLanguage: Language.UKRAINIAN })
        .expect(201);

      const settings = await prisma.userSettings.findFirst({
        where: { user: { email: credentials.email } },
      });

      expect(settings?.language).toBe(Language.UKRAINIAN);
    });

    it('normalizes the email to lower case', async () => {
      const credentials = nextCredentials();

      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ ...credentials, email: credentials.email.toUpperCase() })
        .expect(201);

      const user = await prisma.user.findUnique({
        where: { email: credentials.email },
        select: { id: true },
      });

      expect(user).not.toBeNull();
    });

    it('rejects a duplicate email with 409', async () => {
      const credentials = nextCredentials();

      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(credentials)
        .expect(201);

      const duplicate = nextCredentials();
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ ...duplicate, email: credentials.email })
        .expect(409);
    });

    it('rejects a duplicate username with 409', async () => {
      const credentials = nextCredentials();

      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(credentials)
        .expect(201);

      const duplicate = nextCredentials();
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ ...duplicate, username: credentials.username })
        .expect(409);
    });

    it('leaves no partial account behind when registration is rejected', async () => {
      const credentials = nextCredentials();

      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(credentials)
        .expect(201);

      // Reuse the email but a fresh username: the request must fail and must
      // not create an orphaned Profile for that username.
      const rejected = nextCredentials();
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ ...rejected, email: credentials.email })
        .expect(409);

      const orphan = await prisma.profile.findUnique({
        where: { username: rejected.username },
      });

      expect(orphan).toBeNull();
    });

    describe('validation', () => {
      const invalidCases: {
        name: string;
        overrides: Record<string, unknown>;
      }[] = [
        { name: 'a malformed email', overrides: { email: 'not-an-email' } },
        {
          name: 'a password under 8 characters',
          overrides: { password: 'Ab1!' },
        },
        {
          name: 'a password without an uppercase letter',
          overrides: { password: 'lowercase1!' },
        },
        {
          name: 'a password without a lowercase letter',
          overrides: { password: 'UPPERCASE1!' },
        },
        {
          name: 'a password without a number',
          overrides: { password: 'NoDigitsHere!' },
        },
        {
          name: 'a password without a special character',
          overrides: { password: 'NoSpecial123' },
        },
        {
          name: 'a username under 3 characters',
          overrides: { username: 'ab' },
        },
        {
          name: 'a username over 30 characters',
          overrides: { username: 'a'.repeat(31) },
        },
        {
          name: 'a username with unsupported characters',
          overrides: { username: 'has spaces!' },
        },
        {
          name: 'an unsupported preferred language',
          overrides: { preferredLanguage: 'KLINGON' },
        },
        { name: 'an unknown extra field', overrides: { isAdmin: true } },
      ];

      it.each(invalidCases)('rejects $name with 400', async ({ overrides }) => {
        await request(app.getHttpServer())
          .post('/api/v1/auth/register')
          .send({ ...nextCredentials(), ...overrides })
          .expect(400);
      });

      it.each([['email'], ['password'], ['username']])(
        'rejects a missing %s with 400',
        async (field) => {
          const credentials: Record<string, unknown> = nextCredentials();
          delete credentials[field];

          await request(app.getHttpServer())
            .post('/api/v1/auth/register')
            .send(credentials)
            .expect(400);
        },
      );
    });
  });
});
