import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  AccountStatus,
  NotificationKind,
  QuestionType,
  UserRole,
} from '@prisma/client';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import {
  AssignmentEmailContext,
  EmailService,
} from './../src/email/email.service';
import { PrismaService } from './../src/prisma/prisma.service';

interface Captured {
  recipient: string;
  kind: 'ISSUED' | 'DUE_SOON';
  assignment: AssignmentEmailContext;
}

/** Records every send so the suite can assert on what a learner receives. */
class CapturingEmailService extends EmailService {
  readonly sent: Captured[] = [];

  sendVerificationEmail(): Promise<void> {
    return Promise.resolve();
  }

  sendPasswordResetEmail(): Promise<void> {
    return Promise.resolve();
  }

  sendAssignmentIssuedEmail(
    recipient: string,
    assignment: AssignmentEmailContext,
  ): Promise<void> {
    this.sent.push({ recipient, kind: 'ISSUED', assignment });
    return Promise.resolve();
  }

  sendAssignmentDueSoonEmail(
    recipient: string,
    assignment: AssignmentEmailContext,
  ): Promise<void> {
    this.sent.push({ recipient, kind: 'DUE_SOON', assignment });
    return Promise.resolve();
  }

  forRecipient(recipient: string): Captured[] {
    return this.sent.filter((one) => one.recipient === recipient);
  }
}

const IN_A_WEEK = (): string =>
  new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

/**
 * Assignment notifications (decision 25).
 *
 * The rule that matters is idempotency: a reminder that arrives every time a
 * scheduler happens to run is not a reminder, it is spam. The dispatch row is
 * what claims the right to send, so the sweep is safe to run at any frequency.
 */
describe('Assignment notifications (e2e)', () => {
  const PREFIX = 'notify-e2e';
  const PASSWORD = 'ValidPass1!';
  const SWEEP_URL = '/api/v1/admin/notifications/due-reminders';

  let app: INestApplication;
  let prisma: PrismaService;
  let email: CapturingEmailService;
  let subjectId: string;
  let topicId: string;
  let questionIds: string[] = [];
  let counter = 0;

  let admin: string;
  let teacher: string;
  let student: string;
  let studentId: string;
  let studentEmail: string;
  let groupId: string;

  const register = async (
    role: UserRole,
  ): Promise<{ token: string; userId: string; email: string }> => {
    counter += 1;
    const address = `${PREFIX}-${counter}@example.com`;
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: address,
        username: `${PREFIX.replace(/-/g, '')}${counter}`,
        password: PASSWORD,
      })
      .expect(201);
    const user = await prisma.user.update({
      where: { email: address },
      data: { accountStatus: AccountStatus.ACTIVE, role },
      select: { id: true },
    });
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: address, password: PASSWORD })
      .expect(200);
    return {
      token: (response.body as { accessToken: string }).accessToken,
      userId: user.id,
      email: address,
    };
  };

  const issue = async (
    extra: Record<string, unknown> = {},
  ): Promise<string> => {
    const response = await request(app.getHttpServer())
      .post(`/api/v1/teacher/groups/${groupId}/assignments`)
      .set('Authorization', `Bearer ${teacher}`)
      .send({
        title: 'Домашка',
        dueAt: IN_A_WEEK(),
        mode: 'MANUAL',
        questionIds: questionIds.slice(0, 2),
        ...extra,
      })
      .expect(201);
    return (response.body as { id: string }).id;
  };

  const sweep = () =>
    request(app.getHttpServer())
      .post(SWEEP_URL)
      .set('Authorization', `Bearer ${admin}`);

  /** Brings a deadline inside the reminder window. */
  const dueTomorrow = async (assignmentId: string): Promise<void> => {
    await prisma.assignment.update({
      where: { id: assignmentId },
      data: { dueAt: new Date(Date.now() + 12 * 60 * 60 * 1000) },
    });
  };

  const removeFixtures = async (): Promise<void> => {
    const users = await prisma.user.findMany({
      where: { email: { startsWith: PREFIX } },
      select: { id: true },
    });
    const userIds = users.map((user) => user.id);
    if (userIds.length > 0) {
      const sessions = await prisma.quizSession.findMany({
        where: { userId: { in: userIds } },
        select: { id: true },
      });
      const sessionIds = sessions.map((session) => session.id);
      await prisma.xPTransaction.deleteMany({
        where: { userId: { in: userIds } },
      });
      await prisma.questionAttempt.deleteMany({
        where: { quizSessionId: { in: sessionIds } },
      });
      await prisma.result.deleteMany({
        where: { quizSessionId: { in: sessionIds } },
      });
      await prisma.quizSession.deleteMany({
        where: { userId: { in: userIds } },
      });
    }
    await prisma.assignment.deleteMany({ where: { group: { subjectId } } });
    await prisma.group.deleteMany({ where: { subjectId } });
    await prisma.user.deleteMany({ where: { email: { startsWith: PREFIX } } });
  };

  beforeAll(async () => {
    email = new CapturingEmailService();
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(EmailService)
      .useValue(email)
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

    const subject = await prisma.subject.upsert({
      where: { slug: PREFIX },
      update: { isPublished: true, deletedAt: null },
      create: {
        name: 'Notify fixture',
        slug: PREFIX,
        displayOrder: 9910,
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
    questionIds = [];
    for (let index = 0; index < 3; index += 1) {
      const question = await prisma.question.create({
        data: {
          topicId,
          type: QuestionType.SINGLE_CHOICE,
          title: `Питання ${index}`,
          isPublished: true,
          answerOptions: {
            create: [
              { content: 'Правильна', order: 0, isCorrect: true },
              { content: 'Хибна', order: 1, isCorrect: false },
            ],
          },
        },
        select: { id: true },
      });
      questionIds.push(question.id);
    }

    admin = (await register(UserRole.ADMIN)).token;
    teacher = (await register(UserRole.TEACHER)).token;
    const registered = await register(UserRole.USER);
    student = registered.token;
    studentId = registered.userId;
    studentEmail = registered.email;

    const created = await request(app.getHttpServer())
      .post('/api/v1/teacher/groups')
      .set('Authorization', `Bearer ${teacher}`)
      .send({ name: 'Група', subjectId })
      .expect(201);
    const group = created.body as { id: string; inviteCode: string };
    groupId = group.id;

    await request(app.getHttpServer())
      .post('/api/v1/groups/join')
      .set('Authorization', `Bearer ${student}`)
      .send({ inviteCode: group.inviteCode })
      .expect(200);
  });

  beforeEach(() => {
    email.sent.length = 0;
  });

  afterEach(async () => {
    await prisma.emailDispatch.deleteMany({ where: { userId: studentId } });
    // Sessions pin their assignment with Restrict — a learner's work is never
    // deleted out from under them — so the fixtures come down the same order
    // real data would.
    const sessions = await prisma.quizSession.findMany({
      where: { assignment: { groupId } },
      select: { id: true },
    });
    const sessionIds = sessions.map((session) => session.id);
    if (sessionIds.length > 0) {
      await prisma.xPTransaction.deleteMany({
        where: { quizSessionId: { in: sessionIds } },
      });
      await prisma.questionAttempt.deleteMany({
        where: { quizSessionId: { in: sessionIds } },
      });
      await prisma.result.deleteMany({
        where: { quizSessionId: { in: sessionIds } },
      });
      await prisma.quizSession.deleteMany({
        where: { id: { in: sessionIds } },
      });
    }
    await prisma.assignment.deleteMany({ where: { groupId } });
    await prisma.userSettings.updateMany({
      where: { userId: studentId },
      data: { assignmentEmailsEnabled: true },
    });
  });

  afterAll(async () => {
    await removeFixtures();
    await prisma.question.deleteMany({ where: { topicId } });
    await prisma.topic.deleteMany({ where: { id: topicId } });
    await prisma.subject.deleteMany({ where: { id: subjectId } });
    await app.close();
  });

  describe('new homework', () => {
    it('emails every recipient when an assignment is set', async () => {
      await issue();

      const received = email.forRecipient(studentEmail);
      expect(received).toHaveLength(1);
      expect(received[0].kind).toBe('ISSUED');
      expect(received[0].assignment.title).toBe('Домашка');
      expect(received[0].assignment.questionCount).toBe(2);
      expect(received[0].assignment.url).toContain('/assignments/');
    });

    it('records the dispatch so it cannot be sent twice', async () => {
      const assignmentId = await issue();

      const rows = await prisma.emailDispatch.findMany({
        where: { userId: studentId, refId: assignmentId },
        select: { kind: true },
      });
      expect(rows).toHaveLength(1);
      expect(rows[0].kind).toBe(NotificationKind.ASSIGNMENT_ISSUED);
    });

    it('respects a learner who turned assignment email off', async () => {
      await prisma.userSettings.updateMany({
        where: { userId: studentId },
        data: { assignmentEmailsEnabled: false },
      });

      await issue();

      expect(email.forRecipient(studentEmail)).toHaveLength(0);
    });
  });

  describe('the deadline sweep', () => {
    it('reminds a learner whose deadline is inside the window', async () => {
      const assignmentId = await issue();
      await dueTomorrow(assignmentId);
      email.sent.length = 0;

      const response = await sweep().expect(200);

      expect((response.body as { sent: number }).sent).toBe(1);
      expect(email.forRecipient(studentEmail)[0].kind).toBe('DUE_SOON');
    });

    it('sends nothing on a second run — the point of the dispatch row', async () => {
      const assignmentId = await issue();
      await dueTomorrow(assignmentId);
      await sweep().expect(200);
      email.sent.length = 0;

      const second = await sweep().expect(200);

      expect((second.body as { sent: number }).sent).toBe(0);
      expect(email.forRecipient(studentEmail)).toHaveLength(0);
    });

    it('leaves a distant deadline alone', async () => {
      await issue();
      email.sent.length = 0;

      const response = await sweep().expect(200);

      expect((response.body as { sent: number }).sent).toBe(0);
    });

    it('leaves a deadline that has already passed alone', async () => {
      const assignmentId = await issue();
      await prisma.assignment.update({
        where: { id: assignmentId },
        data: { dueAt: new Date(Date.now() - 60 * 60 * 1000) },
      });
      email.sent.length = 0;

      const response = await sweep().expect(200);

      // Late work is still allowed, but "your deadline is tomorrow" would be
      // a lie, and the learner already knows.
      expect((response.body as { sent: number }).sent).toBe(0);
    });

    it('skips a learner who has already handed in', async () => {
      const assignmentId = await issue();
      await dueTomorrow(assignmentId);

      const started = await request(app.getHttpServer())
        .post(`/api/v1/assignments/${assignmentId}/start`)
        .set('Authorization', `Bearer ${student}`)
        .expect(200);
      await request(app.getHttpServer())
        .post(
          `/api/v1/quiz/${(started.body as { sessionId: string }).sessionId}/complete`,
        )
        .set('Authorization', `Bearer ${student}`)
        .expect(200);
      email.sent.length = 0;

      const response = await sweep().expect(200);

      expect((response.body as { sent: number }).sent).toBe(0);
    });

    it('is closed to everybody but an administrator', async () => {
      await request(app.getHttpServer())
        .post(SWEEP_URL)
        .set('Authorization', `Bearer ${teacher}`)
        .expect(403);
      await request(app.getHttpServer())
        .post(SWEEP_URL)
        .set('Authorization', `Bearer ${student}`)
        .expect(403);
      await request(app.getHttpServer()).post(SWEEP_URL).expect(401);
    });
  });
});
