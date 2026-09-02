import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  AccountStatus,
  QuestionType,
  ScoredAttempt,
  UserRole,
} from '@prisma/client';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

interface SubmissionBody {
  student: { id: string; stillInGroup: boolean };
  status: string;
  attempts: number;
  score: { accuracy: number; late: boolean } | null;
}

interface BreakdownBody {
  questionId: string;
  order: number;
  answered: number;
  correct: number;
  accuracy: number | null;
}

interface AnalyticsBody {
  studentCount: number;
  assignmentsIssued: number;
  completionRate: number | null;
  topics: { topicId: string; topicName: string; accuracy: number }[];
}

interface ProfileBody {
  student: { id: string; leftAt: string | null };
  assignmentsIssued: number;
  assignmentsSubmitted: number;
  assignmentsLate: number;
  overallAccuracy: number | null;
  weakestTopics: { topicId: string; accuracy: number }[];
}

const IN_A_WEEK = (): string =>
  new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

/**
 * The teacher's review screens (docs/02-domain/group.md §6).
 *
 * The suite exists to prove one structural claim: because every figure is
 * derived from assignments, and an assignment's recipients are frozen at issue,
 * a student who leaves the group keeps appearing in the results of work they
 * were given — and appears nowhere else.
 */
describe('Teacher review (e2e)', () => {
  const PREFIX = 'review-e2e';
  const PASSWORD = 'ValidPass1!';

  let app: INestApplication;
  let prisma: PrismaService;
  let subjectId: string;
  let easyTopicId: string;
  let hardTopicId: string;
  let easyQuestionIds: string[] = [];
  let hardQuestionIds: string[] = [];
  let counter = 0;

  let teacher: string;
  let otherTeacher: string;
  let studentA: string;
  let studentAId: string;
  let studentB: string;
  let studentBId: string;

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

  const makeGroup = async (): Promise<{ id: string; inviteCode: string }> => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/teacher/groups')
      .set('Authorization', `Bearer ${teacher}`)
      .send({ name: 'Група', subjectId })
      .expect(201);
    return created.body as { id: string; inviteCode: string };
  };

  const join = async (token: string, inviteCode: string): Promise<void> => {
    await request(app.getHttpServer())
      .post('/api/v1/groups/join')
      .set('Authorization', `Bearer ${token}`)
      .send({ inviteCode })
      .expect(200);
  };

  const issue = async (
    groupId: string,
    questionIds: string[],
    extra: Record<string, unknown> = {},
  ): Promise<string> => {
    const response = await request(app.getHttpServer())
      .post(`/api/v1/teacher/groups/${groupId}/assignments`)
      .set('Authorization', `Bearer ${teacher}`)
      .send({
        title: 'Домашка',
        dueAt: IN_A_WEEK(),
        mode: 'MANUAL',
        questionIds,
        ...extra,
      })
      .expect(201);
    return (response.body as { id: string }).id;
  };

  /**
   * Works through an assignment, answering `correctCount` questions right and
   * the rest wrong, then completes it.
   */
  const doAssignment = async (
    token: string,
    assignmentId: string,
    correctCount: number,
  ): Promise<void> => {
    const started = await request(app.getHttpServer())
      .post(`/api/v1/assignments/${assignmentId}/start`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const sessionId = (started.body as { sessionId: string }).sessionId;

    const listed = await request(app.getHttpServer())
      .get(`/api/v1/quiz/${sessionId}/questions`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const questions = listed.body as {
      id: string;
      answerOptions: { id: string; content: string }[];
    }[];

    for (const [index, question] of questions.entries()) {
      const wanted = index < correctCount ? 'Правильна' : 'Хибна';
      const option = question.answerOptions.find(
        (one) => one.content === wanted,
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

  const seedTopic = async (slug: string, order: number): Promise<string[]> => {
    const topic = await prisma.topic.upsert({
      where: { subjectId_slug: { subjectId, slug } },
      update: { isPublished: true, deletedAt: null },
      create: {
        subjectId,
        name: slug,
        slug,
        displayOrder: order,
        isPublished: true,
      },
      select: { id: true },
    });
    if (slug.endsWith('easy')) {
      easyTopicId = topic.id;
    } else {
      hardTopicId = topic.id;
    }

    await prisma.question.deleteMany({ where: { topicId: topic.id } });
    const ids: string[] = [];
    for (let index = 0; index < 4; index += 1) {
      const question = await prisma.question.create({
        data: {
          topicId: topic.id,
          type: QuestionType.SINGLE_CHOICE,
          title: `${slug} ${index}`,
          explanation: 'Пояснення',
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
      ids.push(question.id);
    }
    return ids;
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

    const subject = await prisma.subject.upsert({
      where: { slug: PREFIX },
      update: { isPublished: true, deletedAt: null },
      create: {
        name: 'Review fixture',
        slug: PREFIX,
        displayOrder: 9970,
        isPublished: true,
      },
      select: { id: true },
    });
    subjectId = subject.id;

    await removeFixtures();
    easyQuestionIds = await seedTopic(`${PREFIX}-easy`, 1);
    hardQuestionIds = await seedTopic(`${PREFIX}-hard`, 2);

    teacher = (await register(UserRole.TEACHER)).token;
    otherTeacher = (await register(UserRole.TEACHER)).token;
    const a = await register(UserRole.USER);
    studentA = a.token;
    studentAId = a.userId;
    const b = await register(UserRole.USER);
    studentB = b.token;
    studentBId = b.userId;
  });

  afterEach(async () => {
    const active = await prisma.quizSession.findMany({
      where: { user: { email: { startsWith: PREFIX } }, status: 'ACTIVE' },
      select: { id: true },
    });
    const ids = active.map((session) => session.id);
    if (ids.length > 0) {
      await prisma.questionAttempt.deleteMany({
        where: { quizSessionId: { in: ids } },
      });
      await prisma.quizSession.deleteMany({ where: { id: { in: ids } } });
    }
  });

  afterAll(async () => {
    await removeFixtures();
    await prisma.question.deleteMany({
      where: { topicId: { in: [easyTopicId, hardTopicId] } },
    });
    await prisma.topic.deleteMany({
      where: { id: { in: [easyTopicId, hardTopicId] } },
    });
    await prisma.subject.deleteMany({ where: { id: subjectId } });
    await app.close();
  });

  describe('submissions', () => {
    it('lists every recipient, done or not', async () => {
      const group = await makeGroup();
      await join(studentA, group.inviteCode);
      await join(studentB, group.inviteCode);
      const assignment = await issue(group.id, easyQuestionIds.slice(0, 2));

      await doAssignment(studentA, assignment, 2);

      const response = await request(app.getHttpServer())
        .get(`/api/v1/teacher/assignments/${assignment}/submissions`)
        .set('Authorization', `Bearer ${teacher}`)
        .expect(200);

      const rows = response.body as SubmissionBody[];
      const byStudent = new Map(rows.map((row) => [row.student.id, row]));

      expect(rows).toHaveLength(2);
      expect(byStudent.get(studentAId)?.status).toBe('SUBMITTED');
      expect(byStudent.get(studentAId)?.score?.accuracy).toBe(100);
      expect(byStudent.get(studentBId)?.status).toBe('NOT_STARTED');
      expect(byStudent.get(studentBId)?.score).toBeNull();
    });

    it('keeps a student who left, and says so', async () => {
      const group = await makeGroup();
      await join(studentA, group.inviteCode);
      const assignment = await issue(group.id, easyQuestionIds.slice(0, 2));
      await doAssignment(studentA, assignment, 1);

      await request(app.getHttpServer())
        .delete(`/api/v1/groups/${group.id}/membership`)
        .set('Authorization', `Bearer ${studentA}`)
        .expect(204);

      const response = await request(app.getHttpServer())
        .get(`/api/v1/teacher/assignments/${assignment}/submissions`)
        .set('Authorization', `Bearer ${teacher}`)
        .expect(200);

      const row = (response.body as SubmissionBody[])[0];
      expect(row.student.id).toBe(studentAId);
      expect(row.student.stillInGroup).toBe(false);
      expect(row.score?.accuracy).toBe(50);
    });

    it('honours FIRST when more than one attempt is allowed', async () => {
      const group = await makeGroup();
      await join(studentA, group.inviteCode);
      const assignment = await issue(group.id, easyQuestionIds.slice(0, 2), {
        attemptsAllowed: 2,
        scoredAttempt: ScoredAttempt.FIRST,
      });

      await doAssignment(studentA, assignment, 1);
      await doAssignment(studentA, assignment, 2);

      const response = await request(app.getHttpServer())
        .get(`/api/v1/teacher/assignments/${assignment}/submissions`)
        .set('Authorization', `Bearer ${teacher}`)
        .expect(200);

      const row = (response.body as SubmissionBody[])[0];
      expect(row.attempts).toBe(2);
      expect(row.score?.accuracy).toBe(50);
    });

    it('honours BEST when the teacher chose it', async () => {
      const group = await makeGroup();
      await join(studentA, group.inviteCode);
      const assignment = await issue(group.id, easyQuestionIds.slice(0, 2), {
        attemptsAllowed: 2,
        scoredAttempt: ScoredAttempt.BEST,
      });

      await doAssignment(studentA, assignment, 1);
      await doAssignment(studentA, assignment, 2);

      const response = await request(app.getHttpServer())
        .get(`/api/v1/teacher/assignments/${assignment}/submissions`)
        .set('Authorization', `Bearer ${teacher}`)
        .expect(200);

      expect((response.body as SubmissionBody[])[0].score?.accuracy).toBe(100);
    });

    it('is closed to another teacher', async () => {
      const group = await makeGroup();
      await join(studentA, group.inviteCode);
      const assignment = await issue(group.id, easyQuestionIds.slice(0, 2));

      await request(app.getHttpServer())
        .get(`/api/v1/teacher/assignments/${assignment}/submissions`)
        .set('Authorization', `Bearer ${otherTeacher}`)
        .expect(404);
    });

    it('is closed to students', async () => {
      const group = await makeGroup();
      await join(studentA, group.inviteCode);
      const assignment = await issue(group.id, easyQuestionIds.slice(0, 2));

      await request(app.getHttpServer())
        .get(`/api/v1/teacher/assignments/${assignment}/submissions`)
        .set('Authorization', `Bearer ${studentA}`)
        .expect(403);
    });
  });

  describe('question breakdown', () => {
    it('shows which questions the class fell over, in paper order', async () => {
      const group = await makeGroup();
      await join(studentA, group.inviteCode);
      await join(studentB, group.inviteCode);
      const assignment = await issue(group.id, easyQuestionIds.slice(0, 3));

      // Both get the first right; only A gets the second right; nobody the third.
      await doAssignment(studentA, assignment, 2);
      await doAssignment(studentB, assignment, 1);

      const response = await request(app.getHttpServer())
        .get(`/api/v1/teacher/assignments/${assignment}/questions`)
        .set('Authorization', `Bearer ${teacher}`)
        .expect(200);

      const rows = response.body as BreakdownBody[];
      expect(rows.map((row) => row.order)).toEqual([0, 1, 2]);
      expect(rows[0].accuracy).toBe(100);
      expect(rows[1].accuracy).toBe(50);
      expect(rows[2].accuracy).toBe(0);
    });

    it('reports null accuracy for a question nobody reached', async () => {
      const group = await makeGroup();
      await join(studentA, group.inviteCode);
      const assignment = await issue(group.id, easyQuestionIds.slice(0, 2));

      const response = await request(app.getHttpServer())
        .get(`/api/v1/teacher/assignments/${assignment}/questions`)
        .set('Authorization', `Bearer ${teacher}`)
        .expect(200);

      expect((response.body as BreakdownBody[])[0].accuracy).toBeNull();
    });
  });

  describe('group analytics', () => {
    it('ranks topics worst first', async () => {
      const group = await makeGroup();
      await join(studentA, group.inviteCode);

      const easy = await issue(group.id, easyQuestionIds.slice(0, 2));
      await doAssignment(studentA, easy, 2);
      const hard = await issue(group.id, hardQuestionIds.slice(0, 2));
      await doAssignment(studentA, hard, 0);

      const response = await request(app.getHttpServer())
        .get(`/api/v1/teacher/groups/${group.id}/analytics`)
        .set('Authorization', `Bearer ${teacher}`)
        .expect(200);

      const body = response.body as AnalyticsBody;
      expect(body.assignmentsIssued).toBe(2);
      expect(body.topics[0].topicId).toBe(hardTopicId);
      expect(body.topics[0].accuracy).toBe(0);
      expect(body.topics[1].accuracy).toBe(100);
    });

    it('measures completion against what was issued', async () => {
      const group = await makeGroup();
      await join(studentA, group.inviteCode);
      await join(studentB, group.inviteCode);
      const assignment = await issue(group.id, easyQuestionIds.slice(0, 2));

      await doAssignment(studentA, assignment, 2);

      const response = await request(app.getHttpServer())
        .get(`/api/v1/teacher/groups/${group.id}/analytics`)
        .set('Authorization', `Bearer ${teacher}`)
        .expect(200);

      // Two recipients, one hand-in.
      expect((response.body as AnalyticsBody).completionRate).toBe(50);
    });

    it('is closed to another teacher', async () => {
      const group = await makeGroup();

      await request(app.getHttpServer())
        .get(`/api/v1/teacher/groups/${group.id}/analytics`)
        .set('Authorization', `Bearer ${otherTeacher}`)
        .expect(404);
    });
  });

  describe('student profile', () => {
    it('counts issued, submitted and weak topics from this group only', async () => {
      const group = await makeGroup();
      await join(studentA, group.inviteCode);

      const easy = await issue(group.id, easyQuestionIds.slice(0, 2));
      await doAssignment(studentA, easy, 2);
      const hard = await issue(group.id, hardQuestionIds.slice(0, 2));
      await doAssignment(studentA, hard, 0);
      await issue(group.id, easyQuestionIds.slice(2, 4));

      const response = await request(app.getHttpServer())
        .get(`/api/v1/teacher/groups/${group.id}/students/${studentAId}`)
        .set('Authorization', `Bearer ${teacher}`)
        .expect(200);

      const body = response.body as ProfileBody;
      expect(body.assignmentsIssued).toBe(3);
      expect(body.assignmentsSubmitted).toBe(2);
      expect(body.overallAccuracy).toBe(50);
      expect(body.weakestTopics[0].topicId).toBe(hardTopicId);
    });

    it('still answers for a student who left, and dates the departure', async () => {
      const group = await makeGroup();
      await join(studentA, group.inviteCode);
      const assignment = await issue(group.id, easyQuestionIds.slice(0, 2));
      await doAssignment(studentA, assignment, 1);
      await request(app.getHttpServer())
        .delete(`/api/v1/groups/${group.id}/membership`)
        .set('Authorization', `Bearer ${studentA}`)
        .expect(204);

      const response = await request(app.getHttpServer())
        .get(`/api/v1/teacher/groups/${group.id}/students/${studentAId}`)
        .set('Authorization', `Bearer ${teacher}`)
        .expect(200);

      const body = response.body as ProfileBody;
      expect(body.student.leftAt).not.toBeNull();
      expect(body.assignmentsSubmitted).toBe(1);
    });

    it('refuses a student who was never in the group', async () => {
      const group = await makeGroup();
      await join(studentA, group.inviteCode);

      await request(app.getHttpServer())
        .get(`/api/v1/teacher/groups/${group.id}/students/${studentBId}`)
        .set('Authorization', `Bearer ${teacher}`)
        .expect(404);
    });
  });

  describe('assignments from the group mistakes', () => {
    it('draws from the topics the group is weakest in', async () => {
      const group = await makeGroup();
      await join(studentA, group.inviteCode);

      const easy = await issue(group.id, easyQuestionIds.slice(0, 2));
      await doAssignment(studentA, easy, 2);
      const hard = await issue(group.id, hardQuestionIds.slice(0, 2));
      await doAssignment(studentA, hard, 0);

      const created = await request(app.getHttpServer())
        .post(`/api/v1/teacher/groups/${group.id}/assignments`)
        .set('Authorization', `Bearer ${teacher}`)
        .send({
          title: 'Робота над помилками',
          dueAt: IN_A_WEEK(),
          mode: 'MISTAKES',
          count: 3,
        })
        .expect(201);

      const assignmentId = (created.body as { id: string }).id;
      const rows = await prisma.assignmentQuestion.findMany({
        where: { assignmentId },
        select: { question: { select: { topicId: true } } },
      });

      // The weakest topic leads the pool, so the draw must reach into it.
      expect(rows.some((row) => row.question.topicId === hardTopicId)).toBe(
        true,
      );
    });

    it('refuses when the group has no results to judge by', async () => {
      const group = await makeGroup();
      await join(studentA, group.inviteCode);

      await request(app.getHttpServer())
        .post(`/api/v1/teacher/groups/${group.id}/assignments`)
        .set('Authorization', `Bearer ${teacher}`)
        .send({
          title: 'Рано',
          dueAt: IN_A_WEEK(),
          mode: 'MISTAKES',
          count: 2,
        })
        .expect(400);
    });
  });
});
