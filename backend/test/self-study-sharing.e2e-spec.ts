import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AccountStatus, QuestionType, UserRole } from '@prisma/client';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { listenOnLoopback } from './loopback';

interface SelfStudyBody {
  shared: boolean;
  visible: boolean;
  sessions: number | null;
  questionsAnswered: number | null;
  accuracy: number | null;
  topics: { topicId: string; accuracy: number }[];
}

interface ProfileBody {
  selfStudy: SelfStudyBody;
}

interface JoinBody {
  id: string;
  selfStudyShared: boolean;
}

const IN_A_WEEK = (): string =>
  new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

/**
 * Sharing a learner's own practice with their tutor (decisions 04 and 16).
 *
 * Two gates, and both must be open: the membership has to be current, and the
 * learner has to be sharing. What crosses is a shape — how much, how well, on
 * which topics — never the sessions themselves. That line is what separates a
 * signal a tutor can act on from surveillance a teenager routes around.
 */
describe('Self-study sharing (e2e)', () => {
  const PREFIX = 'sharing-e2e';
  const PASSWORD = 'ValidPass1!';
  const SETTINGS_URL = '/api/v1/users/me/settings';

  let app: INestApplication;
  let prisma: PrismaService;
  let subjectId: string;
  let otherSubjectId: string;
  let topicId: string;
  let otherTopicId: string;
  let counter = 0;

  let teacher: string;
  let student: string;
  let studentId: string;
  let groupId: string;
  let inviteCode: string;

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

  /** Runs one practice quiz and finishes it. */
  const practise = async (
    token: string,
    subject: string,
    topic: string,
  ): Promise<void> => {
    const started = await request(app.getHttpServer())
      .post('/api/v1/quiz/start')
      .set('Authorization', `Bearer ${token}`)
      .send({
        subjectId: subject,
        topicId: topic,
        questionCount: 2,
        timerEnabled: false,
      })
      .expect(201);
    const sessionId = (started.body as { sessionId: string }).sessionId;

    const listed = await request(app.getHttpServer())
      .get(`/api/v1/quiz/${sessionId}/questions`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    for (const question of listed.body as {
      id: string;
      answerOptions: { id: string; content: string }[];
    }[]) {
      const option = question.answerOptions.find(
        (one) => one.content === 'Правильна',
      );
      await request(app.getHttpServer())
        .post(`/api/v1/quiz/${sessionId}/answers`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          questionId: question.id,
          selectedAnswer: { answerOptionId: option?.id },
        })
        .expect(200);
    }
    await request(app.getHttpServer())
      .post(`/api/v1/quiz/${sessionId}/complete`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  };

  const profile = async (): Promise<SelfStudyBody> => {
    const response = await request(app.getHttpServer())
      .get(`/api/v1/teacher/groups/${groupId}/students/${studentId}`)
      .set('Authorization', `Bearer ${teacher}`)
      .expect(200);
    return (response.body as ProfileBody).selfStudy;
  };

  const setSharing = (enabled: boolean) =>
    request(app.getHttpServer())
      .patch(SETTINGS_URL)
      .set('Authorization', `Bearer ${student}`)
      .send({ shareSelfStudyWithTutors: enabled });

  const seedTopic = async (subject: string, slug: string): Promise<string> => {
    const topic = await prisma.topic.upsert({
      where: { subjectId_slug: { subjectId: subject, slug } },
      update: { isPublished: true, deletedAt: null },
      create: {
        subjectId: subject,
        name: slug,
        slug,
        displayOrder: 1,
        isPublished: true,
      },
      select: { id: true },
    });
    await prisma.question.deleteMany({ where: { topicId: topic.id } });
    for (let index = 0; index < 4; index += 1) {
      await prisma.question.create({
        data: {
          topicId: topic.id,
          type: QuestionType.SINGLE_CHOICE,
          title: `${slug} ${index}`,
          isPublished: true,
          answerOptions: {
            create: [
              { content: 'Правильна', order: 0, isCorrect: true },
              { content: 'Хибна', order: 1, isCorrect: false },
            ],
          },
        },
      });
    }
    return topic.id;
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
    await prisma.assignment.deleteMany({
      where: { group: { subjectId: { in: [subjectId, otherSubjectId] } } },
    });
    await prisma.group.deleteMany({
      where: { subjectId: { in: [subjectId, otherSubjectId] } },
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
        name: 'Sharing fixture',
        slug: PREFIX,
        displayOrder: 9900,
        isPublished: true,
      },
      select: { id: true },
    });
    subjectId = subject.id;

    const other = await prisma.subject.upsert({
      where: { slug: `${PREFIX}-other` },
      update: { isPublished: true, deletedAt: null },
      create: {
        name: 'Other fixture',
        slug: `${PREFIX}-other`,
        displayOrder: 9901,
        isPublished: true,
      },
      select: { id: true },
    });
    otherSubjectId = other.id;

    await removeFixtures();
    topicId = await seedTopic(subjectId, PREFIX);
    otherTopicId = await seedTopic(otherSubjectId, `${PREFIX}-other`);

    teacher = (await register(UserRole.TEACHER)).token;
    const registered = await register(UserRole.USER);
    student = registered.token;
    studentId = registered.userId;

    const created = await request(app.getHttpServer())
      .post('/api/v1/teacher/groups')
      .set('Authorization', `Bearer ${teacher}`)
      .send({ name: 'Група', subjectId })
      .expect(201);
    const group = created.body as { id: string; inviteCode: string };
    groupId = group.id;
    inviteCode = group.inviteCode;

    await request(app.getHttpServer())
      .post('/api/v1/groups/join')
      .set('Authorization', `Bearer ${student}`)
      .send({ inviteCode })
      .expect(200);
  });

  afterEach(async () => {
    await prisma.userSettings.updateMany({
      where: { userId: studentId },
      data: { shareSelfStudyWithTutors: true },
    });
    // Re-open the membership for the tests that close it.
    const open = await prisma.groupMembership.findFirst({
      where: { groupId, studentId, leftAt: null },
      select: { id: true },
    });
    if (!open) {
      await prisma.groupMembership.create({ data: { groupId, studentId } });
    }
  });

  afterAll(async () => {
    await removeFixtures();
    await prisma.question.deleteMany({
      where: { topicId: { in: [topicId, otherTopicId] } },
    });
    await prisma.topic.deleteMany({
      where: { id: { in: [topicId, otherTopicId] } },
    });
    await prisma.subject.deleteMany({
      where: { id: { in: [subjectId, otherSubjectId] } },
    });
    await app.close();
  });

  describe('the disclosure', () => {
    it('tells the learner what joining means, right when they join', async () => {
      const newcomer = await register(UserRole.USER);

      const response = await request(app.getHttpServer())
        .post('/api/v1/groups/join')
        .set('Authorization', `Bearer ${newcomer.token}`)
        .send({ inviteCode })
        .expect(200);

      // On by default, and said out loud at the moment it starts to apply.
      expect((response.body as JoinBody).selfStudyShared).toBe(true);
    });

    it('reports sharing as off for a learner who turned it off first', async () => {
      const newcomer = await register(UserRole.USER);
      await request(app.getHttpServer())
        .patch(SETTINGS_URL)
        .set('Authorization', `Bearer ${newcomer.token}`)
        .send({ shareSelfStudyWithTutors: false })
        .expect(200);

      const response = await request(app.getHttpServer())
        .post('/api/v1/groups/join')
        .set('Authorization', `Bearer ${newcomer.token}`)
        .send({ inviteCode })
        .expect(200);

      expect((response.body as JoinBody).selfStudyShared).toBe(false);
    });
  });

  describe('the setting', () => {
    it('is on by default and switchable both ways', async () => {
      const before = await request(app.getHttpServer())
        .get(SETTINGS_URL)
        .set('Authorization', `Bearer ${student}`)
        .expect(200);
      expect(
        (before.body as { shareSelfStudyWithTutors: boolean })
          .shareSelfStudyWithTutors,
      ).toBe(true);

      const off = await setSharing(false).expect(200);
      expect(
        (off.body as { shareSelfStudyWithTutors: boolean })
          .shareSelfStudyWithTutors,
      ).toBe(false);

      const on = await setSharing(true).expect(200);
      expect(
        (on.body as { shareSelfStudyWithTutors: boolean })
          .shareSelfStudyWithTutors,
      ).toBe(true);
    });

    it('also exposes the assignment-email switch', async () => {
      const response = await request(app.getHttpServer())
        .patch(SETTINGS_URL)
        .set('Authorization', `Bearer ${student}`)
        .send({ assignmentEmailsEnabled: false })
        .expect(200);

      expect(
        (response.body as { assignmentEmailsEnabled: boolean })
          .assignmentEmailsEnabled,
      ).toBe(false);

      await request(app.getHttpServer())
        .patch(SETTINGS_URL)
        .set('Authorization', `Bearer ${student}`)
        .send({ assignmentEmailsEnabled: true })
        .expect(200);
    });
  });

  describe('what the tutor sees', () => {
    it('shows the shape of the practice', async () => {
      await practise(student, subjectId, topicId);

      const summary = await profile();

      expect(summary.shared).toBe(true);
      expect(summary.visible).toBe(true);
      expect(summary.sessions).toBeGreaterThanOrEqual(1);
      expect(summary.questionsAnswered).toBeGreaterThanOrEqual(2);
      expect(summary.accuracy).toBe(100);
      expect(summary.topics[0].topicId).toBe(topicId);
    });

    it('never carries individual sessions', async () => {
      await practise(student, subjectId, topicId);

      const response = await request(app.getHttpServer())
        .get(`/api/v1/teacher/groups/${groupId}/students/${studentId}`)
        .set('Authorization', `Bearer ${teacher}`)
        .expect(200);

      const serialized = JSON.stringify(
        (response.body as ProfileBody).selfStudy,
      );
      expect(serialized).not.toContain('sessionId');
      expect(serialized).not.toContain('completedAt"');
    });

    it('stays inside the group subject', async () => {
      await practise(student, otherSubjectId, otherTopicId);

      const summary = await profile();

      // A maths tutor has no business seeing English practice.
      expect(
        summary.topics.some((topic) => topic.topicId === otherTopicId),
      ).toBe(false);
    });

    it('goes blank the moment the learner turns sharing off', async () => {
      await practise(student, subjectId, topicId);
      await setSharing(false).expect(200);

      const summary = await profile();

      expect(summary.shared).toBe(false);
      expect(summary.visible).toBe(false);
      expect(summary.sessions).toBeNull();
      expect(summary.accuracy).toBeNull();
      expect(summary.topics).toEqual([]);
    });

    it('goes blank the day the learner leaves the group', async () => {
      await practise(student, subjectId, topicId);
      await request(app.getHttpServer())
        .delete(`/api/v1/groups/${groupId}/membership`)
        .set('Authorization', `Bearer ${student}`)
        .expect(204);

      const summary = await profile();

      // The archive of set work survives departure; this window does not.
      expect(summary.visible).toBe(false);
      expect(summary.sessions).toBeNull();
    });

    it('leaves homework out of it — that is the other section', async () => {
      // Measured as a delta: earlier tests in this suite have already left
      // practice behind, so the honest question is whether homework adds to
      // the count, not whether the count happens to be zero.
      const before = (await profile()).sessions;

      const assignment = await request(app.getHttpServer())
        .post(`/api/v1/teacher/groups/${groupId}/assignments`)
        .set('Authorization', `Bearer ${teacher}`)
        .send({
          title: 'Домашка',
          dueAt: IN_A_WEEK(),
          mode: 'TOPIC',
          topicId,
          count: 2,
        })
        .expect(201);

      const started = await request(app.getHttpServer())
        .post(
          `/api/v1/assignments/${(assignment.body as { id: string }).id}/start`,
        )
        .set('Authorization', `Bearer ${student}`)
        .expect(200);
      await request(app.getHttpServer())
        .post(
          `/api/v1/quiz/${(started.body as { sessionId: string }).sessionId}/complete`,
        )
        .set('Authorization', `Bearer ${student}`)
        .expect(200);

      const summary = await profile();

      expect(summary.sessions).toBe(before);
    });
  });
});
