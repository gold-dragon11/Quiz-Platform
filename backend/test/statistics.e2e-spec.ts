import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  AccountStatus,
  Language,
  QuestionType,
  UserRole,
} from '@prisma/client';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

interface OverallBody {
  totalXP: number;
  currentLevel: number;
  completedQuizzes: number;
  averageAccuracy: string;
  totalQuestions: number;
  correctAnswers: number;
  totalStudyTime: number;
  xpForCurrentLevel: number;
  xpForNextLevel: number;
  xpIntoLevel: number;
  completionPercent: number;
}

interface SubjectStat {
  subjectId: string;
  subjectName: string;
  completedQuizzes: number;
  totalQuestions: number;
  averageAccuracy: string;
  earnedXP: number;
}

interface TopicStat extends SubjectStat {
  topicId: string;
  topicName: string;
}

interface RecentPage {
  items: {
    sessionId: string;
    subjectId: string;
    subjectName: string;
    topicId: string | null;
    topicName: string | null;
    score: string;
    accuracy: string;
    xpEarned: number;
    completedAt: string;
  }[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

/**
 * Statistics & Progress read API — Phase 5.2 (docs/04-api/statistics.md).
 */
describe('Statistics (e2e)', () => {
  const EMAIL_PREFIX = 'phase52-stats';
  const USERNAME_PREFIX = 'phase52stats';
  const SLUG_PREFIX = 'p52';
  const PASSWORD = 'ValidPass1!';

  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let subjectId: string;
  let topicId: string;
  let secondTopicId: string;
  let counter = 0;

  const registerUser = async (): Promise<{ token: string; userId: string }> => {
    counter += 1;
    const email = `${EMAIL_PREFIX}-${counter}@example.com`;
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email,
        username: `${USERNAME_PREFIX}${counter}`,
        password: PASSWORD,
      })
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
    };
  };

  const adminReq = (
    method: 'post' | 'put' | 'patch',
    url: string,
    body: Record<string, unknown>,
  ): request.Test =>
    request(app.getHttpServer())
      [method](url)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(body);

  const createSingleChoice = async (parentTopic: string): Promise<void> => {
    counter += 1;
    const created = await adminReq('post', '/api/v1/admin/questions', {
      topicId: parentTopic,
      type: QuestionType.SINGLE_CHOICE,
      title: `Phase52 Q ${counter}?`,
      options: [{ content: 'Right', isCorrect: true }, { content: 'Wrong' }],
    }).expect(201);
    const id = (created.body as { id: string }).id;
    await adminReq('patch', `/api/v1/admin/questions/${id}/publish`, {
      isPublished: true,
    }).expect(200);
  };

  // Plays a full quiz: starts, answers `correct` of `total` correctly, completes.
  const playQuiz = async (
    token: string,
    parentTopic: string | undefined,
    total: number,
    correct: number,
  ): Promise<void> => {
    const started = await request(app.getHttpServer())
      .post('/api/v1/quiz/start')
      .set('Authorization', `Bearer ${token}`)
      .send({
        subjectId,
        ...(parentTopic ? { topicId: parentTopic } : {}),
        questionCount: total,
        timerEnabled: false,
      })
      .expect(201);
    const sessionId = (started.body as { sessionId: string }).sessionId;

    const questions = (
      await request(app.getHttpServer())
        .get(`/api/v1/quiz/${sessionId}/questions`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
    ).body as {
      id: string;
      answerOptions: { id: string; content: string }[];
    }[];

    for (let i = 0; i < questions.length; i += 1) {
      const q = questions[i];
      const pick =
        i < correct
          ? q.answerOptions.find((o) => o.content === 'Right')!
          : q.answerOptions.find((o) => o.content === 'Wrong')!;
      await request(app.getHttpServer())
        .post(`/api/v1/quiz/${sessionId}/answers`)
        .set('Authorization', `Bearer ${token}`)
        .send({ questionId: q.id, selectedAnswer: { answerOptionId: pick.id } })
        .expect(200);
    }

    await request(app.getHttpServer())
      .post(`/api/v1/quiz/${sessionId}/complete`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  };

  const overall = async (token: string): Promise<OverallBody> =>
    (
      await request(app.getHttpServer())
        .get('/api/v1/statistics')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
    ).body as OverallBody;

  const removeTestData = async (): Promise<void> => {
    await prisma.xPTransaction.deleteMany({
      where: { user: { email: { startsWith: EMAIL_PREFIX } } },
    });
    await prisma.quizSession.deleteMany({
      where: { user: { email: { startsWith: EMAIL_PREFIX } } },
    });
    await prisma.question.deleteMany({
      where: { topic: { slug: { startsWith: SLUG_PREFIX } } },
    });
    await prisma.topic.deleteMany({
      where: { slug: { startsWith: SLUG_PREFIX } },
    });
    await prisma.subject.deleteMany({
      where: { slug: { startsWith: SLUG_PREFIX } },
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

    const email = `${EMAIL_PREFIX}-admin@example.com`;
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, username: `${USERNAME_PREFIX}admin`, password: PASSWORD })
      .expect(201);
    await prisma.user.update({
      where: { email },
      data: { accountStatus: AccountStatus.ACTIVE, role: UserRole.ADMIN },
    });
    adminToken = (
      (
        await request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({ email, password: PASSWORD })
          .expect(200)
      ).body as { accessToken: string }
    ).accessToken;

    const subject = await adminReq('post', '/api/v1/admin/subjects', {
      name: 'Phase52 Subject',
      slug: `${SLUG_PREFIX}-subject`,
    }).expect(201);
    subjectId = (subject.body as { id: string }).id;
    await adminReq('put', `/api/v1/admin/subjects/${subjectId}`, {
      isPublished: true,
    }).expect(200);
    // Ukrainian translation for the subject.
    await adminReq('put', `/api/v1/admin/subjects/${subjectId}`, {
      locale: Language.UKRAINIAN,
      name: 'Фаза52 Предмет',
    }).expect(200);

    const makeTopic = async (label: string): Promise<string> => {
      const topic = await adminReq('post', '/api/v1/admin/topics', {
        subjectId,
        name: `Phase52 Topic ${label}`,
        slug: `${SLUG_PREFIX}-topic-${label}`,
      }).expect(201);
      const id = (topic.body as { id: string }).id;
      await adminReq('put', `/api/v1/admin/topics/${id}`, {
        isPublished: true,
      }).expect(200);
      return id;
    };
    topicId = await makeTopic('main');
    secondTopicId = await makeTopic('second');

    for (let i = 0; i < 10; i += 1) {
      await createSingleChoice(topicId);
    }
    for (let i = 0; i < 10; i += 1) {
      await createSingleChoice(secondTopicId);
    }
  });

  afterAll(async () => {
    await removeTestData();
    await app.close();
  });

  describe('authentication', () => {
    it.each([
      ['overall', '/api/v1/statistics'],
      ['progress', '/api/v1/statistics/progress'],
      ['subjects', '/api/v1/statistics/subjects'],
      ['topics', '/api/v1/statistics/topics'],
      ['recent', '/api/v1/statistics/recent'],
    ])('%s requires a token (401)', async (_name, url) => {
      await request(app.getHttpServer()).get(url).expect(401);
    });
  });

  describe('empty state (decision S8)', () => {
    it('returns a well-formed zero payload for a new user', async () => {
      const { token } = await registerUser();

      const body = await overall(token);
      expect(body).toMatchObject({
        totalXP: 0,
        currentLevel: 1,
        completedQuizzes: 0,
        averageAccuracy: '0.00',
        totalQuestions: 0,
        correctAnswers: 0,
        totalStudyTime: 0,
        xpForCurrentLevel: 0,
        xpForNextLevel: 100,
        xpIntoLevel: 0,
        completionPercent: 0,
      });

      const subjects = await request(app.getHttpServer())
        .get('/api/v1/statistics/subjects')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(subjects.body).toEqual([]);

      const recent = await request(app.getHttpServer())
        .get('/api/v1/statistics/recent')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect((recent.body as RecentPage).totalItems).toBe(0);
      expect((recent.body as RecentPage).items).toEqual([]);
    });

    it('never exposes internal fields', async () => {
      const { token } = await registerUser();
      const body = await overall(token);
      const raw = JSON.stringify(body);
      expect(raw).not.toContain('incorrectAnswers');
      expect(raw).not.toContain('Streak');
      expect(raw).not.toContain('updatedAt');
      expect(Object.keys(body).sort()).toEqual(
        [
          'averageAccuracy',
          'completedQuizzes',
          'completionPercent',
          'correctAnswers',
          'currentLevel',
          'totalQuestions',
          'totalStudyTime',
          'totalXP',
          'xpForCurrentLevel',
          'xpForNextLevel',
          'xpIntoLevel',
        ].sort(),
      );
    });
  });

  describe('overall statistics and level', () => {
    it('aggregates completed quizzes and derives the level from XP', async () => {
      const { token } = await registerUser();
      // Quiz 1: 8/10 = 80% → 80 XP. Quiz 2: 5/10 = 50% → 50 XP. Total 130 XP.
      await playQuiz(token, topicId, 10, 8);
      await playQuiz(token, secondTopicId, 10, 5);

      const body = await overall(token);
      expect(body.completedQuizzes).toBe(2);
      expect(body.totalQuestions).toBe(20);
      expect(body.correctAnswers).toBe(13);
      expect(body.totalXP).toBe(130);
      // Cumulative accuracy 13/20 = 65%.
      expect(body.averageAccuracy).toBe('65.00');
      // 130 XP → level 2 (floor(130/100)+1), 30 into level, 30% done.
      expect(body.currentLevel).toBe(2);
      expect(body.xpForCurrentLevel).toBe(100);
      expect(body.xpForNextLevel).toBe(200);
      expect(body.xpIntoLevel).toBe(30);
      expect(body.completionPercent).toBe(30);
    });

    it('progress mirrors the level math', async () => {
      const { token } = await registerUser();
      await playQuiz(token, topicId, 10, 9); // 90% → 90 + 25 bonus = 115 XP

      const progress = await request(app.getHttpServer())
        .get('/api/v1/statistics/progress')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(progress.body).toEqual({
        currentLevel: 2,
        totalXP: 115,
        xpForNextLevel: 200,
        xpIntoLevel: 15,
        completionPercent: 15,
      });
    });
  });

  describe('subject and topic statistics', () => {
    it('groups by subject and topic with per-group accuracy and XP', async () => {
      const { token } = await registerUser();
      await playQuiz(token, topicId, 10, 7); // main topic: 70% → 70 XP
      await playQuiz(token, secondTopicId, 10, 4); // second topic: 40% → 40 XP

      const subjects = (
        await request(app.getHttpServer())
          .get('/api/v1/statistics/subjects')
          .set('Authorization', `Bearer ${token}`)
          .expect(200)
      ).body as SubjectStat[];
      expect(subjects).toHaveLength(1);
      expect(subjects[0]).toMatchObject({
        subjectId,
        completedQuizzes: 2,
        totalQuestions: 20,
        averageAccuracy: '55.00', // 11/20
        earnedXP: 110,
      });

      const topics = (
        await request(app.getHttpServer())
          .get('/api/v1/statistics/topics')
          .set('Authorization', `Bearer ${token}`)
          .expect(200)
      ).body as TopicStat[];
      expect(topics).toHaveLength(2);
      const main = topics.find((t) => t.topicId === topicId);
      const second = topics.find((t) => t.topicId === secondTopicId);
      expect(main).toMatchObject({
        completedQuizzes: 1,
        totalQuestions: 10,
        averageAccuracy: '70.00',
        earnedXP: 70,
        subjectId,
      });
      expect(second).toMatchObject({
        averageAccuracy: '40.00',
        earnedXP: 40,
      });
    });

    it('filters topics by subjectId and excludes topicless (random) quizzes', async () => {
      const { token } = await registerUser();
      await playQuiz(token, topicId, 5, 5); // topic quiz
      await playQuiz(token, undefined, 5, 5); // RANDOM_QUIZ, no topic

      const all = (
        await request(app.getHttpServer())
          .get('/api/v1/statistics/topics')
          .set('Authorization', `Bearer ${token}`)
          .expect(200)
      ).body as TopicStat[];
      // Only the topic-scoped quiz shows up; the random quiz has no topic.
      expect(all.every((t) => t.topicId !== null)).toBe(true);
      expect(all.some((t) => t.topicId === topicId)).toBe(true);

      const filtered = (
        await request(app.getHttpServer())
          .get(`/api/v1/statistics/topics?subjectId=${subjectId}`)
          .set('Authorization', `Bearer ${token}`)
          .expect(200)
      ).body as TopicStat[];
      expect(filtered.every((t) => t.subjectId === subjectId)).toBe(true);

      // But the subject aggregate counts every completed quiz (topic or not).
      const subjects = (
        await request(app.getHttpServer())
          .get('/api/v1/statistics/subjects')
          .set('Authorization', `Bearer ${token}`)
          .expect(200)
      ).body as SubjectStat[];
      expect(subjects[0].completedQuizzes).toBe(2);
    });

    it('localizes subject names with fallback', async () => {
      const { token } = await registerUser();
      await playQuiz(token, topicId, 3, 3);

      const uk = (
        await request(app.getHttpServer())
          .get('/api/v1/statistics/subjects?locale=UKRAINIAN')
          .set('Authorization', `Bearer ${token}`)
          .expect(200)
      ).body as SubjectStat[];
      expect(uk[0].subjectName).toBe('Фаза52 Предмет');

      const en = (
        await request(app.getHttpServer())
          .get('/api/v1/statistics/subjects')
          .set('Authorization', `Bearer ${token}`)
          .expect(200)
      ).body as SubjectStat[];
      expect(en[0].subjectName).toBe('Phase52 Subject');
    });

    it('rejects a malformed subjectId filter with 400', async () => {
      const { token } = await registerUser();
      await request(app.getHttpServer())
        .get('/api/v1/statistics/topics?subjectId=not-a-uuid')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
    });
  });

  describe('recent activity', () => {
    it('returns completed sessions newest first with the pagination envelope', async () => {
      const { token } = await registerUser();
      await playQuiz(token, topicId, 3, 3);
      await playQuiz(token, secondTopicId, 4, 2);

      const page = (
        await request(app.getHttpServer())
          .get('/api/v1/statistics/recent')
          .set('Authorization', `Bearer ${token}`)
          .expect(200)
      ).body as RecentPage;

      expect(page.page).toBe(1);
      expect(page.pageSize).toBe(20);
      expect(page.totalItems).toBe(2);
      expect(page.totalPages).toBe(1);
      // Newest (the second-topic quiz) first.
      expect(page.items[0].topicId).toBe(secondTopicId);
      expect(page.items[0].score).toBe('50.00');
      expect(page.items[0].xpEarned).toBe(50);
      expect(page.items[1].topicId).toBe(topicId);
      expect(page.items[1].score).toBe('100.00');
    });

    it('paginates', async () => {
      const { token } = await registerUser();
      await playQuiz(token, topicId, 2, 2);
      await playQuiz(token, secondTopicId, 2, 2);

      const first = (
        await request(app.getHttpServer())
          .get('/api/v1/statistics/recent?pageSize=1')
          .set('Authorization', `Bearer ${token}`)
          .expect(200)
      ).body as RecentPage;
      const second = (
        await request(app.getHttpServer())
          .get('/api/v1/statistics/recent?pageSize=1&page=2')
          .set('Authorization', `Bearer ${token}`)
          .expect(200)
      ).body as RecentPage;

      expect(first.totalPages).toBe(2);
      expect(first.items).toHaveLength(1);
      expect(second.items).toHaveLength(1);
      expect(first.items[0].sessionId).not.toBe(second.items[0].sessionId);
    });

    it.each([
      ['page=0', '?page=0'],
      ['pageSize>100', '?pageSize=101'],
      ['unknown param', '?foo=bar'],
    ])('rejects %s with 400', async (_name, query) => {
      const { token } = await registerUser();
      await request(app.getHttpServer())
        .get(`/api/v1/statistics/recent${query}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
    });
  });

  describe('ownership isolation (decision S7)', () => {
    it('never mixes another user’s statistics', async () => {
      const a = await registerUser();
      const b = await registerUser();
      await playQuiz(a.token, topicId, 5, 5); // A earns XP
      // B has done nothing.

      const bodyB = await overall(b.token);
      expect(bodyB.totalXP).toBe(0);
      expect(bodyB.completedQuizzes).toBe(0);

      const bodyA = await overall(a.token);
      expect(bodyA.completedQuizzes).toBe(1);
    });

    it('deferred trends endpoint is not mapped (404)', async () => {
      const { token } = await registerUser();
      await request(app.getHttpServer())
        .get('/api/v1/statistics/trends')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });
  });
});
