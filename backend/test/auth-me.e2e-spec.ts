import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import {
  AccountStatus,
  AvatarType,
  Language,
  Theme,
  UserRole,
} from '@prisma/client';
import * as jwt from 'jsonwebtoken';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { DEFAULT_AVATAR_URL } from './../src/common/constants/avatar.constants';
import { AppConfig } from './../src/config/configuration';
import { PrismaService } from './../src/prisma/prisma.service';

/** The documented session summary (docs/04-api/authentication.md §11). */
interface CurrentUserBody {
  id: string;
  email: string;
  role: UserRole;
  accountStatus: AccountStatus;
  emailVerified: boolean;
  createdAt: string;
  profile: { username: string; displayName: string; bio: string | null } | null;
  avatar: { type: AvatarType; imageUrl: string } | null;
  settings: {
    language: Language;
    theme: Theme;
    publicProfileEnabled: boolean;
  } | null;
}

/**
 * GET /api/v1/auth/me end-to-end tests (docs/04-api/authentication.md §11).
 *
 * Accounts are created through the real registration endpoint, then activated
 * and logged in, so every fixture uses the same data the application writes in
 * production.
 */
describe('Current User (e2e)', () => {
  const EMAIL_PREFIX = 'phase34-me';
  const USERNAME_PREFIX = 'phase34me';
  const PASSWORD = 'ValidPass1!';
  const ME_URL = '/api/v1/auth/me';
  const LOGIN_URL = '/api/v1/auth/login';
  const REGISTER_URL = '/api/v1/auth/register';

  let app: INestApplication;
  let prisma: PrismaService;
  let accessSecret: string;
  let refreshSecret: string;
  let counter = 0;

  interface Account {
    email: string;
    username: string;
    userId: string;
    accessToken: string;
  }

  /** Registers, activates, and logs in an account, returning its access token. */
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

    const { accessToken } = response.body as { accessToken: string };
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    return { email, username, userId: user!.id, accessToken };
  };

  const getMe = async (
    token: string,
    expectedStatus: number,
  ): Promise<CurrentUserBody> => {
    const response = await request(app.getHttpServer())
      .get(ME_URL)
      .set('Authorization', `Bearer ${token}`)
      .expect(expectedStatus);

    return response.body as CurrentUserBody;
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

  describe('valid token', () => {
    it('returns 200 with the account, profile, avatar, and settings', async () => {
      const account = await createLoggedInAccount();

      const body = await getMe(account.accessToken, 200);

      expect(body.id).toBe(account.userId);
      expect(body.email).toBe(account.email);
      expect(body.role).toBe(UserRole.USER);
      expect(body.accountStatus).toBe(AccountStatus.ACTIVE);
      expect(body.emailVerified).toBe(false);
      expect(typeof body.createdAt).toBe('string');

      expect(body.profile).toEqual({
        username: account.username,
        displayName: account.username,
        bio: null,
      });
      expect(body.avatar).toEqual({
        type: AvatarType.PREDEFINED,
        imageUrl: DEFAULT_AVATAR_URL,
      });
      expect(body.settings).toEqual({
        language: Language.ENGLISH,
        theme: Theme.DARK,
        publicProfileEnabled: true,
      });
    });

    it('returns exactly the documented top-level fields', async () => {
      const account = await createLoggedInAccount();

      const body = await getMe(account.accessToken, 200);

      expect(Object.keys(body).sort()).toEqual([
        'accountStatus',
        'avatar',
        'createdAt',
        'email',
        'emailVerified',
        'id',
        'profile',
        'role',
        'settings',
      ]);
    });

    it('excludes learning statistics', async () => {
      const account = await createLoggedInAccount();

      const body = await getMe(account.accessToken, 200);

      expect(body).not.toHaveProperty('statistics');
      expect(JSON.stringify(body)).not.toContain('totalXP');
    });

    it('never exposes the password hash', async () => {
      const account = await createLoggedInAccount();

      const body = await getMe(account.accessToken, 200);

      const serialized = JSON.stringify(body);
      expect(serialized).not.toContain('passwordHash');
      expect(serialized).not.toContain('argon2');
      expect(serialized).not.toContain(PASSWORD);
    });

    it('loads the record from the database rather than the token', async () => {
      const account = await createLoggedInAccount();

      // Change data after the token was minted. A response built from token
      // claims would still show the old values.
      await prisma.profile.update({
        where: { username: account.username },
        data: { displayName: 'Renamed After Login', bio: 'Added later' },
      });
      await prisma.userSettings.update({
        where: { userId: account.userId },
        data: { language: Language.UKRAINIAN },
      });

      const body = await getMe(account.accessToken, 200);

      expect(body.profile?.displayName).toBe('Renamed After Login');
      expect(body.profile?.bio).toBe('Added later');
      expect(body.settings?.language).toBe(Language.UKRAINIAN);
    });
  });

  describe('rejected tokens', () => {
    it('rejects a missing Authorization header with 401', async () => {
      await request(app.getHttpServer()).get(ME_URL).expect(401);
    });

    it('rejects a malformed token with 401', async () => {
      await getMe('not-a-jwt', 401);
    });

    it('rejects a token signed with the wrong secret with 401', async () => {
      const account = await createLoggedInAccount();

      // A refresh token must not be usable as an access token.
      const forged = jwt.sign(
        { sub: account.userId, email: account.email, role: UserRole.USER },
        refreshSecret,
        { expiresIn: '15m' },
      );

      await getMe(forged, 401);
    });

    it('rejects an expired token with 401', async () => {
      const account = await createLoggedInAccount();

      const expired = jwt.sign(
        { sub: account.userId, email: account.email, role: UserRole.USER },
        accessSecret,
        { expiresIn: '-1s' },
      );

      await getMe(expired, 401);
    });

    it('rejects a non-Bearer authorization scheme with 401', async () => {
      const account = await createLoggedInAccount();

      await request(app.getHttpServer())
        .get(ME_URL)
        .set('Authorization', `Basic ${account.accessToken}`)
        .expect(401);
    });

    it('rejects a token for a user that no longer exists with 401', async () => {
      const account = await createLoggedInAccount();

      await prisma.user.delete({ where: { id: account.userId } });

      await getMe(account.accessToken, 401);
    });
  });

  describe('account status re-check', () => {
    it.each([
      [AccountStatus.PENDING_VERIFICATION],
      [AccountStatus.SUSPENDED],
      [AccountStatus.DELETED],
    ])(
      'rejects a previously valid token once the account becomes %s',
      async (status) => {
        const account = await createLoggedInAccount();

        // The token is still within its lifetime and correctly signed.
        await getMe(account.accessToken, 200);

        await prisma.user.update({
          where: { id: account.userId },
          data: { accountStatus: status },
        });

        await getMe(account.accessToken, 401);
      },
    );

    it('reveals nothing about why access was refused', async () => {
      const account = await createLoggedInAccount();
      await prisma.user.update({
        where: { id: account.userId },
        data: { accountStatus: AccountStatus.SUSPENDED },
      });

      const suspended = await getMe(account.accessToken, 401);
      const garbage = await getMe('not-a-jwt', 401);

      const serialized = JSON.stringify(suspended);
      expect(serialized).not.toContain('SUSPENDED');
      expect(serialized).not.toContain('suspend');
      expect(suspended.email).toBeUndefined();

      // Both refusals look the same apart from the timestamp.
      expect((suspended as unknown as { message: string }).message).toBe(
        (garbage as unknown as { message: string }).message,
      );
    });
  });
});
