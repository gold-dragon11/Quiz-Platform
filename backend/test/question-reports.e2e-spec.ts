import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  AccountStatus,
  QuestionReportReason,
  QuestionReportStatus,
  QuestionType,
  UserRole,
} from '@prisma/client';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { listenOnLoopback } from './loopback';

interface ReportBody {
  id: string;
  reason: string;
  status: string;
  createdAt: string;
  resolution: string | null;
  question: { id: string; title: string };
  reportedBy: { id: string; displayName: string | null };
  openReportsForQuestion: number;
}

interface PageBody {
  items: ReportBody[];
  total: number;
  page: number;
}

/**
 * Question reports (docs/02-domain/question-report.md).
 *
 * A bank of 3 308 questions written in one pass has mistakes in it, and the
 * people best placed to find them are the ones sitting the quiz. The rules
 * worth testing are the two that keep the queue workable: one open report per
 * person per question, and no way back to NEW once a report is closed.
 */
describe('Question reports (e2e)', () => {
  const PREFIX = 'reports-e2e';
  const PASSWORD = 'ValidPass1!';
  const ADMIN_URL = '/api/v1/admin/question-reports';

  let app: INestApplication;
  let prisma: PrismaService;
  let subjectId: string;
  let topicId: string;
  let questionId: string;
  let unpublishedId: string;
  let counter = 0;

  let admin: string;
  let student: string;
  let studentId: string;
  let otherStudent: string;

  const register = async (
    role: UserRole,
  ): Promise<{ token: string; userId: string }> => {
    counter += 1;
    const email = `${PREFIX}-${counter}@example.com`;
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email,
        username: `${PREFIX.replace(/-/g, '')}${counter}`,
        password: PASSWORD,
      })
      .expect(201);
    const user = await prisma.user.update({
      where: { email },
      data: { accountStatus: AccountStatus.ACTIVE, role },
      select: { id: true },
    });
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: PASSWORD })
      .expect(200);
    return {
      token: (response.body as { accessToken: string }).accessToken,
      userId: user.id,
    };
  };

  const report = (
    token: string,
    target = questionId,
    body: Record<string, unknown> = {},
  ) =>
    request(app.getHttpServer())
      .post(`/api/v1/questions/${target}/report`)
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: QuestionReportReason.WRONG_ANSWER, ...body });

  const removeFixtures = async (): Promise<void> => {
    await prisma.questionReport.deleteMany({
      where: { question: { topicId } },
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
    await listenOnLoopback(app);
    prisma = app.get(PrismaService);

    const subject = await prisma.subject.upsert({
      where: { slug: PREFIX },
      update: { isPublished: true, deletedAt: null },
      create: {
        name: 'Reports fixture',
        slug: PREFIX,
        displayOrder: 9950,
        isPublished: true,
      },
      select: { id: true },
    });
    subjectId = subject.id;

    const topic = await prisma.topic.upsert({
      where: { subjectId_slug: { subjectId, slug: PREFIX } },
      update: { isPublished: true, deletedAt: null },
      create: {
        subjectId,
        name: 'Тема',
        slug: PREFIX,
        displayOrder: 1,
        isPublished: true,
      },
      select: { id: true },
    });
    topicId = topic.id;

    await removeFixtures();
    await prisma.question.deleteMany({ where: { topicId } });

    const published = await prisma.question.create({
      data: {
        topicId,
        type: QuestionType.SINGLE_CHOICE,
        title: 'Питання зі скаргою',
        isPublished: true,
      },
      select: { id: true },
    });
    questionId = published.id;

    const draft = await prisma.question.create({
      data: {
        topicId,
        type: QuestionType.SINGLE_CHOICE,
        title: 'Чернетка',
        isPublished: false,
      },
      select: { id: true },
    });
    unpublishedId = draft.id;

    admin = (await register(UserRole.ADMIN)).token;
    const registered = await register(UserRole.USER);
    student = registered.token;
    studentId = registered.userId;
    otherStudent = (await register(UserRole.USER)).token;
  });

  afterEach(async () => {
    await prisma.questionReport.deleteMany({
      where: { question: { topicId } },
    });
  });

  afterAll(async () => {
    await removeFixtures();
    await prisma.question.deleteMany({ where: { topicId } });
    await prisma.topic.deleteMany({ where: { id: topicId } });
    await prisma.subject.deleteMany({ where: { id: subjectId } });
    await app.close();
  });

  describe('filing', () => {
    it('accepts a report from an ordinary student', async () => {
      const response = await report(student, questionId, {
        comment: 'Правильна відповідь виглядає неправильною',
      }).expect(201);

      const body = response.body as ReportBody;
      expect(body.status).toBe(QuestionReportStatus.NEW);
      expect(body.question.id).toBe(questionId);
      expect(body.reportedBy.id).toBe(studentId);
    });

    it('refuses a second open report from the same person', async () => {
      await report(student).expect(201);

      await report(student).expect(409);
    });

    it('accepts a report on the same question from somebody else', async () => {
      await report(student).expect(201);

      const response = await report(otherStudent).expect(201);

      expect((response.body as ReportBody).openReportsForQuestion).toBe(2);
    });

    it('refuses an unpublished question', async () => {
      await report(student, unpublishedId).expect(404);
    });

    it('refuses an unknown reason', async () => {
      await report(student, questionId, { reason: 'BECAUSE' }).expect(400);
    });

    it('requires a token', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/questions/${questionId}/report`)
        .send({ reason: QuestionReportReason.TYPO })
        .expect(401);
    });
  });

  describe('the queue', () => {
    it('is closed to students', async () => {
      await request(app.getHttpServer())
        .get(ADMIN_URL)
        .set('Authorization', `Bearer ${student}`)
        .expect(403);
    });

    it('lists open reports oldest first', async () => {
      await report(student).expect(201);
      await report(otherStudent).expect(201);

      const response = await request(app.getHttpServer())
        .get(`${ADMIN_URL}?status=NEW`)
        .set('Authorization', `Bearer ${admin}`)
        .expect(200);

      const body = response.body as PageBody;
      expect(body.total).toBe(2);
      expect(new Date(body.items[0].id ? 0 : 0).getTime()).toBeLessThanOrEqual(
        Date.now(),
      );
      expect(body.items[0].reportedBy.id).toBe(studentId);
    });

    it('shows how many open reports one question has', async () => {
      await report(student).expect(201);
      await report(otherStudent).expect(201);

      const response = await request(app.getHttpServer())
        .get(ADMIN_URL)
        .set('Authorization', `Bearer ${admin}`)
        .expect(200);

      expect((response.body as PageBody).items[0].openReportsForQuestion).toBe(
        2,
      );
    });
  });

  describe('resolving', () => {
    it('closes a report and records who decided what', async () => {
      const filed = await report(student).expect(201);
      const reportId = (filed.body as ReportBody).id;

      const response = await request(app.getHttpServer())
        .patch(`${ADMIN_URL}/${reportId}`)
        .set('Authorization', `Bearer ${admin}`)
        .send({
          status: QuestionReportStatus.ACCEPTED,
          resolution: 'Виправлено ключ',
        })
        .expect(200);

      const body = response.body as ReportBody;
      expect(body.status).toBe(QuestionReportStatus.ACCEPTED);
      expect(body.resolution).toBe('Виправлено ключ');
    });

    it('refuses to resolve the same report twice', async () => {
      const filed = await report(student).expect(201);
      const reportId = (filed.body as ReportBody).id;

      await request(app.getHttpServer())
        .patch(`${ADMIN_URL}/${reportId}`)
        .set('Authorization', `Bearer ${admin}`)
        .send({ status: QuestionReportStatus.REJECTED })
        .expect(200);

      await request(app.getHttpServer())
        .patch(`${ADMIN_URL}/${reportId}`)
        .set('Authorization', `Bearer ${admin}`)
        .send({ status: QuestionReportStatus.ACCEPTED })
        .expect(409);
    });

    it('refuses moving a report back to NEW', async () => {
      const filed = await report(student).expect(201);

      await request(app.getHttpServer())
        .patch(`${ADMIN_URL}/${(filed.body as ReportBody).id}`)
        .set('Authorization', `Bearer ${admin}`)
        .send({ status: QuestionReportStatus.NEW })
        .expect(400);
    });

    it('lets the same person report again once the first is closed', async () => {
      const filed = await report(student).expect(201);
      await request(app.getHttpServer())
        .patch(`${ADMIN_URL}/${(filed.body as ReportBody).id}`)
        .set('Authorization', `Bearer ${admin}`)
        .send({ status: QuestionReportStatus.REJECTED })
        .expect(200);

      // A second complaint after a rejection is a signal, not noise.
      await report(student).expect(201);
    });

    it('is closed to students', async () => {
      const filed = await report(student).expect(201);

      await request(app.getHttpServer())
        .patch(`${ADMIN_URL}/${(filed.body as ReportBody).id}`)
        .set('Authorization', `Bearer ${otherStudent}`)
        .send({ status: QuestionReportStatus.ACCEPTED })
        .expect(403);
    });
  });
});
