import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  AccountStatus,
  Difficulty,
  QuestionType,
  UserRole,
} from '@prisma/client';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

interface QuestionBody {
  id: string;
  title: string;
  explanation: string | null;
  isPublished: boolean;
  answerOptions: { id: string; content: string; isCorrect: boolean }[];
}

interface PageBody {
  items: QuestionBody[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

/**
 * The question bank as a teacher reads it.
 *
 * The rules worth protecting: teachers see the keys (that is the point),
 * students never do (that would break every quiz), and nobody sees the
 * administrator's unfinished drafts.
 */
describe('Teacher question bank (e2e)', () => {
  const PREFIX = 'teachqb';
  const PASSWORD = 'ValidPass1!';
  const URL = '/api/v1/teacher/questions';

  let app: INestApplication;
  let prisma: PrismaService;
  let teacherToken: string;
  let studentToken: string;
  let adminToken: string;
  let subjectId: string;
  let topicId: string;
  let publishedId: string;
  let draftId: string;
  let counter = 0;

  const register = async (role: UserRole): Promise<string> => {
    counter += 1;
    const email = `${PREFIX}-${counter}@example.com`;
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, username: `${PREFIX}${counter}`, password: PASSWORD })
      .expect(201);
    await prisma.user.update({
      where: { email },
      data: { accountStatus: AccountStatus.ACTIVE, role },
    });
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: PASSWORD })
      .expect(200);
    return (login.body as { accessToken: string }).accessToken;
  };

  const removeFixtures = async (): Promise<void> => {
    await prisma.question.deleteMany({
      where: { topic: { slug: { startsWith: PREFIX } } },
    });
    await prisma.topic.deleteMany({ where: { slug: { startsWith: PREFIX } } });
    await prisma.subject.deleteMany({
      where: { slug: { startsWith: PREFIX } },
    });
    await prisma.user.deleteMany({ where: { email: { startsWith: PREFIX } } });
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
    await removeFixtures();

    teacherToken = await register(UserRole.TEACHER);
    studentToken = await register(UserRole.USER);
    adminToken = await register(UserRole.ADMIN);

    const subject = await prisma.subject.create({
      data: {
        name: 'Teacher QB',
        slug: `${PREFIX}-subject`,
        isPublished: true,
        displayOrder: 900,
      },
    });
    subjectId = subject.id;
    const topic = await prisma.topic.create({
      data: {
        name: 'Teacher QB topic',
        slug: `${PREFIX}-topic`,
        subjectId,
        isPublished: true,
        displayOrder: 1,
      },
    });
    topicId = topic.id;

    const published = await prisma.question.create({
      data: {
        topicId,
        type: QuestionType.SINGLE_CHOICE,
        title: 'Опублікованe питання банку',
        difficulty: Difficulty.BEGINNER,
        explanation: 'Пояснення, яке бачить лише викладач до здачі.',
        isPublished: true,
        answerOptions: {
          create: [
            { content: 'Правильна', isCorrect: true, order: 0 },
            { content: 'Хибна', isCorrect: false, order: 1 },
          ],
        },
      },
    });
    publishedId = published.id;

    const draft = await prisma.question.create({
      data: {
        topicId,
        type: QuestionType.SINGLE_CHOICE,
        title: 'Чернетка адміністратора',
        difficulty: Difficulty.BEGINNER,
        isPublished: false,
        answerOptions: {
          create: [
            { content: 'Правильна', isCorrect: true, order: 0 },
            { content: 'Хибна', isCorrect: false, order: 1 },
          ],
        },
      },
    });
    draftId = draft.id;
  });

  afterAll(async () => {
    await removeFixtures();
    await app.close();
  });

  const list = (query: Record<string, unknown> = {}, token = teacherToken) =>
    request(app.getHttpServer())
      .get(URL)
      .query(query)
      .set('Authorization', `Bearer ${token}`);

  describe('who may read it', () => {
    it('refuses an unauthenticated caller', async () => {
      await request(app.getHttpServer()).get(URL).expect(401);
    });

    it('refuses a student — the keys are exactly what a quiz withholds', async () => {
      await list({}, studentToken).expect(403);
    });

    it('refuses an administrator, who has their own surface', async () => {
      // @TeacherOnly() admits one role. An administrator manages the bank
      // through /admin/questions and owns no groups.
      await list({}, adminToken).expect(403);
    });
  });

  describe('what it returns', () => {
    it('carries the correct answers and the explanation', async () => {
      const response = await list({ topicId }).expect(200);
      const question = (response.body as PageBody).items.find(
        (item) => item.id === publishedId,
      );

      expect(question).toBeDefined();
      expect(question?.explanation).toBe(
        'Пояснення, яке бачить лише викладач до здачі.',
      );
      expect(question?.answerOptions.some((option) => option.isCorrect)).toBe(
        true,
      );
    });

    it('hides the administrator’s unpublished drafts', async () => {
      const response = await list({ topicId, pageSize: 100 }).expect(200);
      const ids = (response.body as PageBody).items.map((item) => item.id);

      expect(ids).toContain(publishedId);
      expect(ids).not.toContain(draftId);
    });

    it('refuses to let publication be filtered at all', async () => {
      // Not merely ignored: accepted-and-ignored would look identical to
      // working, and the next reader would assume drafts were reachable.
      await list({ topicId, isPublished: false }).expect(400);
    });

    it('narrows by subject and by search', async () => {
      const bySubject = await list({ subjectId, pageSize: 100 }).expect(200);
      expect(
        (bySubject.body as PageBody).items.map((item) => item.id),
      ).toContain(publishedId);

      const bySearch = await list({ search: 'Опублікован' }).expect(200);
      expect(
        (bySearch.body as PageBody).items.map((item) => item.id),
      ).toContain(publishedId);
    });

    it('uses the same pagination envelope as every other collection', async () => {
      const response = await list({ topicId, pageSize: 1 }).expect(200);
      expect(Object.keys(response.body as object).sort()).toEqual([
        'items',
        'page',
        'pageSize',
        'totalItems',
        'totalPages',
      ]);
    });
  });
});
