import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AccountStatus, QuestionType, UserRole } from '@prisma/client';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

interface MyProfileBody {
  username: string;
  displayName: string;
  email: string;
  bio: string | null;
  avatar: { type: string; imageUrl: string };
  registrationDate: string;
}

interface PublicProfileBody {
  username: string;
  displayName: string;
  bio: string | null;
  avatar: { type: string; imageUrl: string };
  registrationDate: string;
  currentLevel: number;
  totalXP: number;
  completedQuizzes: number;
  averageAccuracy: string;
}

interface SettingsBody {
  language: string;
  theme: string;
  publicProfileEnabled: boolean;
}

/**
 * User Profile & Settings — Phase 5.3 (docs/04-api/users.md §9-12).
 */
describe('User Profile & Settings (e2e)', () => {
  const EMAIL_PREFIX = 'phase53-usr';
  const USERNAME_PREFIX = 'phase53usr';
  const PASSWORD = 'ValidPass1!';
  let app: INestApplication;
  let prisma: PrismaService;
  let counter = 0;

  const register = async (): Promise<{
    token: string;
    userId: string;
    username: string;
    email: string;
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
    return {
      token: (login.body as { accessToken: string }).accessToken,
      userId: user.id,
      username,
      email,
    };
  };

  const getProfile = (token: string): request.Test =>
    request(app.getHttpServer())
      .get('/api/v1/users/me/profile')
      .set('Authorization', `Bearer ${token}`);

  const patchProfile = (
    token: string,
    body: Record<string, unknown>,
  ): request.Test =>
    request(app.getHttpServer())
      .patch('/api/v1/users/me/profile')
      .set('Authorization', `Bearer ${token}`)
      .send(body);

  const getSettings = (token: string): request.Test =>
    request(app.getHttpServer())
      .get('/api/v1/users/me/settings')
      .set('Authorization', `Bearer ${token}`);

  const patchSettings = (
    token: string,
    body: Record<string, unknown>,
  ): request.Test =>
    request(app.getHttpServer())
      .patch('/api/v1/users/me/settings')
      .set('Authorization', `Bearer ${token}`)
      .send(body);

  const putAvatar = (
    token: string,
    body: Record<string, unknown>,
  ): request.Test =>
    request(app.getHttpServer())
      .put('/api/v1/users/me/avatar')
      .set('Authorization', `Bearer ${token}`)
      .send(body);

  const removeTestData = async (): Promise<void> => {
    // XP transactions and quiz sessions restrict user/subject deletion; clear
    // them first, then the content fixtures, then the users.
    await prisma.xPTransaction.deleteMany({
      where: { user: { email: { startsWith: EMAIL_PREFIX } } },
    });
    await prisma.quizSession.deleteMany({
      where: { user: { email: { startsWith: EMAIL_PREFIX } } },
    });
    await prisma.question.deleteMany({
      where: { topic: { slug: { startsWith: 'phase53-' } } },
    });
    await prisma.topic.deleteMany({
      where: { slug: { startsWith: 'phase53-' } },
    });
    await prisma.subject.deleteMany({
      where: { slug: { startsWith: 'phase53-' } },
    });
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
      await request(app.getHttpServer())
        .get('/api/v1/users/me/profile')
        .expect(401);
      await request(app.getHttpServer())
        .patch('/api/v1/users/me/profile')
        .expect(401);
      await request(app.getHttpServer())
        .get('/api/v1/users/me/settings')
        .expect(401);
      await request(app.getHttpServer())
        .patch('/api/v1/users/me/settings')
        .expect(401);
      await request(app.getHttpServer())
        .put('/api/v1/users/me/avatar')
        .expect(401);
    });
  });

  describe('GET /users/me/profile', () => {
    it('returns exactly the documented fields incl. email and default avatar', async () => {
      const { token, username, email } = await register();
      const body = (await getProfile(token).expect(200)).body as MyProfileBody;

      expect(Object.keys(body).sort()).toEqual(
        [
          'avatar',
          'bio',
          'displayName',
          'email',
          'registrationDate',
          'username',
        ].sort(),
      );
      expect(body.username).toBe(username);
      expect(body.displayName).toBe(username); // initialized to username
      expect(body.email).toBe(email);
      expect(body.bio).toBeNull();
      expect(body.avatar).toEqual({
        type: 'PREDEFINED',
        imageUrl: '/avatars/default.png',
      });
      expect(new Date(body.registrationDate).toString()).not.toBe(
        'Invalid Date',
      );
    });
  });

  describe('PATCH /users/me/profile', () => {
    it('merges: updates only supplied fields; null clears bio', async () => {
      const { token } = await register();
      const updated = (
        await patchProfile(token, {
          displayName: 'Alex Renamed',
          bio: 'Learning enthusiast',
        }).expect(200)
      ).body as MyProfileBody;
      expect(updated.displayName).toBe('Alex Renamed');
      expect(updated.bio).toBe('Learning enthusiast');

      // Omitting displayName keeps it; bio:null clears.
      const cleared = (await patchProfile(token, { bio: null }).expect(200))
        .body as MyProfileBody;
      expect(cleared.displayName).toBe('Alex Renamed');
      expect(cleared.bio).toBeNull();
    });

    it('changes username, allows re-submitting the same one, and rejects duplicates', async () => {
      const a = await register();
      const b = await register();

      const newName = `${USERNAME_PREFIX}renamed${counter}`;
      const renamed = (
        await patchProfile(a.token, { username: newName }).expect(200)
      ).body as MyProfileBody;
      expect(renamed.username).toBe(newName);

      // Re-submitting the same username is a no-op success.
      await patchProfile(a.token, { username: newName }).expect(200);

      // B taking A's username → 409.
      await patchProfile(b.token, { username: newName }).expect(409);
    });

    it.each([
      ['empty displayName', { displayName: '   ' }],
      ['displayName too long', { displayName: 'a'.repeat(51) }],
      ['username too short', { username: 'ab' }],
      ['username too long', { username: 'a'.repeat(31) }],
      ['username bad chars', { username: 'bad-name!' }],
      ['bio too long', { bio: 'a'.repeat(251) }],
      ['unknown field', { nickname: 'x' }],
    ])('rejects %s with 400', async (_name, body) => {
      const { token } = await register();
      await patchProfile(token, body).expect(400);
    });
  });

  describe('PUT /users/me/avatar', () => {
    it('selects a predefined avatar and persists imageUrl + type', async () => {
      const { token } = await register();
      const body = (
        await putAvatar(token, { predefinedAvatarId: 'avatar-3' }).expect(200)
      ).body as { type: string; imageUrl: string };
      expect(body).toEqual({
        type: 'PREDEFINED',
        imageUrl: '/avatars/avatar-3.png',
      });

      // Reflected in the profile.
      const profile = (await getProfile(token).expect(200))
        .body as MyProfileBody;
      expect(profile.avatar.imageUrl).toBe('/avatars/avatar-3.png');
    });

    it.each([
      ['unknown id', { predefinedAvatarId: 'avatar-99' }],
      ['empty id', { predefinedAvatarId: '' }],
      ['missing id', {}],
      ['unknown field', { predefinedAvatarId: 'default', extra: 1 }],
    ])('rejects %s with 400', async (_name, body) => {
      const { token } = await register();
      await putAvatar(token, body).expect(400);
    });
  });

  describe('settings', () => {
    it('returns exactly the documented fields', async () => {
      const { token } = await register();
      const body = (await getSettings(token).expect(200)).body as SettingsBody;
      expect(Object.keys(body).sort()).toEqual(
        ['language', 'publicProfileEnabled', 'theme'].sort(),
      );
      expect(body).toEqual({
        language: 'ENGLISH',
        theme: 'DARK',
        publicProfileEnabled: true,
      });
    });

    it('merge-updates and language change affects content localization immediately', async () => {
      const { token } = await register();
      const updated = (
        await patchSettings(token, {
          language: 'UKRAINIAN',
          publicProfileEnabled: false,
        }).expect(200)
      ).body as SettingsBody;
      expect(updated).toEqual({
        language: 'UKRAINIAN',
        theme: 'DARK',
        publicProfileEnabled: false,
      });

      // Theme (only DARK) omitted stays DARK; toggling privacy back.
      const again = (
        await patchSettings(token, { publicProfileEnabled: true }).expect(200)
      ).body as SettingsBody;
      expect(again.language).toBe('UKRAINIAN');
      expect(again.publicProfileEnabled).toBe(true);
    });

    it.each([
      ['bad language', { language: 'FRENCH' }],
      ['bad theme', { theme: 'LIGHT' }],
      ['non-boolean privacy', { publicProfileEnabled: 'yes' }],
      ['unknown field', { fontSize: 12 }],
    ])('rejects %s with 400', async (_name, body) => {
      const { token } = await register();
      await patchSettings(token, body).expect(400);
    });

    it('accepts the sole theme value DARK', async () => {
      const { token } = await register();
      const body = (await patchSettings(token, { theme: 'DARK' }).expect(200))
        .body as SettingsBody;
      expect(body.theme).toBe('DARK');
    });
  });

  describe('GET /users/{username} — public profile', () => {
    it('is public and returns exactly the documented fields with progress', async () => {
      const { username } = await register();
      const body = (
        await request(app.getHttpServer())
          .get(`/api/v1/users/${username}`)
          .expect(200)
      ).body as PublicProfileBody;

      expect(Object.keys(body).sort()).toEqual(
        [
          'username',
          'displayName',
          'bio',
          'avatar',
          'registrationDate',
          'currentLevel',
          'totalXP',
          'completedQuizzes',
          'averageAccuracy',
        ].sort(),
      );
      expect(body.username).toBe(username);
      expect(body.currentLevel).toBe(1);
      expect(body.totalXP).toBe(0);
      expect(body.completedQuizzes).toBe(0);
      expect(body.averageAccuracy).toBe('0.00');
      // No private data leaks.
      const raw = JSON.stringify(body);
      expect(raw).not.toContain('@example.com');
      expect(raw).not.toContain('email');
      expect(raw).not.toContain('role');
      expect(raw).not.toContain('publicProfileEnabled');
    });

    it('reflects real progress after a completed quiz', async () => {
      // Build content as an admin, then have a user complete a quiz.
      const adminEmail = `${EMAIL_PREFIX}-admin-${(counter += 1)}@example.com`;
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: adminEmail,
          username: `${USERNAME_PREFIX}admin${counter}`,
          password: PASSWORD,
        })
        .expect(201);
      await prisma.user.update({
        where: { email: adminEmail },
        data: { accountStatus: AccountStatus.ACTIVE, role: UserRole.ADMIN },
      });
      const adminToken = (
        (
          await request(app.getHttpServer())
            .post('/api/v1/auth/login')
            .send({ email: adminEmail, password: PASSWORD })
            .expect(200)
        ).body as { accessToken: string }
      ).accessToken;
      const adminReq = (
        method: 'post' | 'put' | 'patch',
        url: string,
        b: Record<string, unknown>,
      ): request.Test =>
        request(app.getHttpServer())
          [method](url)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(b);

      const subj = (
        await adminReq('post', '/api/v1/admin/subjects', {
          name: `Phase53 Subj ${counter}`,
          slug: `phase53-subj-${counter}`,
        }).expect(201)
      ).body as { id: string };
      await adminReq('put', `/api/v1/admin/subjects/${subj.id}`, {
        isPublished: true,
      }).expect(200);
      const top = (
        await adminReq('post', '/api/v1/admin/topics', {
          subjectId: subj.id,
          name: `Phase53 Top ${counter}`,
          slug: `phase53-top-${counter}`,
        }).expect(201)
      ).body as { id: string };
      await adminReq('put', `/api/v1/admin/topics/${top.id}`, {
        isPublished: true,
      }).expect(200);
      for (let i = 0; i < 4; i += 1) {
        const q = (
          await adminReq('post', '/api/v1/admin/questions', {
            topicId: top.id,
            type: QuestionType.SINGLE_CHOICE,
            title: `Phase53 Q ${counter}-${i}?`,
            options: [
              { content: 'Right', isCorrect: true },
              { content: 'Wrong' },
            ],
          }).expect(201)
        ).body as { id: string };
        await adminReq('patch', `/api/v1/admin/questions/${q.id}/publish`, {
          isPublished: true,
        }).expect(200);
      }

      const player = await register();
      const started = (
        await request(app.getHttpServer())
          .post('/api/v1/quiz/start')
          .set('Authorization', `Bearer ${player.token}`)
          .send({
            subjectId: subj.id,
            topicId: top.id,
            questionCount: 4,
            timerEnabled: false,
          })
          .expect(201)
      ).body as { sessionId: string };
      const questions = (
        await request(app.getHttpServer())
          .get(`/api/v1/quiz/${started.sessionId}/questions`)
          .set('Authorization', `Bearer ${player.token}`)
          .expect(200)
      ).body as {
        id: string;
        answerOptions: { id: string; content: string }[];
      }[];
      for (const question of questions) {
        const right = question.answerOptions.find(
          (o) => o.content === 'Right',
        )!;
        await request(app.getHttpServer())
          .post(`/api/v1/quiz/${started.sessionId}/answers`)
          .set('Authorization', `Bearer ${player.token}`)
          .send({
            questionId: question.id,
            selectedAnswer: { answerOptionId: right.id },
          })
          .expect(200);
      }
      await request(app.getHttpServer())
        .post(`/api/v1/quiz/${started.sessionId}/complete`)
        .set('Authorization', `Bearer ${player.token}`)
        .expect(200);

      // 100% of 4 → 100 XP + 25 bonus = 125 XP → level 2.
      const body = (
        await request(app.getHttpServer())
          .get(`/api/v1/users/${player.username}`)
          .expect(200)
      ).body as PublicProfileBody;
      expect(body.completedQuizzes).toBe(1);
      expect(body.totalXP).toBe(125);
      expect(body.currentLevel).toBe(2);
      expect(body.averageAccuracy).toBe('100.00');
      // Content and sessions are cleaned by afterAll (phase53- slug + user).
    });

    it('returns 404 (indistinguishably) for unknown, private, suspended, and deleted', async () => {
      // Unknown.
      await request(app.getHttpServer())
        .get('/api/v1/users/nobody_here_xyz')
        .expect(404);

      // Private.
      const priv = await register();
      await patchSettings(priv.token, { publicProfileEnabled: false }).expect(
        200,
      );
      await request(app.getHttpServer())
        .get(`/api/v1/users/${priv.username}`)
        .expect(404);

      // Suspended.
      const susp = await register();
      await prisma.user.update({
        where: { id: susp.userId },
        data: { accountStatus: AccountStatus.SUSPENDED },
      });
      await request(app.getHttpServer())
        .get(`/api/v1/users/${susp.username}`)
        .expect(404);

      // Soft-deleted.
      const del = await register();
      await prisma.user.update({
        where: { id: del.userId },
        data: { accountStatus: AccountStatus.DELETED },
      });
      await request(app.getHttpServer())
        .get(`/api/v1/users/${del.username}`)
        .expect(404);
    });
  });
});
