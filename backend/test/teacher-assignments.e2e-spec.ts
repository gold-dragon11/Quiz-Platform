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

interface GroupBody {
  id: string;
  inviteCode: string;
}

interface AssignmentBody {
  id: string;
  title: string;
  questionCount: number;
  targetCount: number;
  submittedCount: number;
  dueAt: string;
  attemptsAllowed: number;
}

interface StudentAssignmentBody {
  id: string;
  title: string;
  status: string;
  questionCount: number;
  attemptsUsed: number;
  late: boolean;
}

const IN_A_WEEK = (): string =>
  new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

/**
 * Assignments end to end (docs/02-domain/assignment.md).
 *
 * The point of this suite is the freeze. An assignment records what was set, to
 * whom, and when; if either snapshot leaks into a live query, a student who
 * joined yesterday starts receiving last month's homework and a student who
 * left stops appearing in results they actually submitted.
 */
describe('Assignments (e2e)', () => {
  const PREFIX = 'assign-e2e';
  const PASSWORD = 'ValidPass1!';
  const TEACHER_URL = '/api/v1/teacher';
  const STUDENT_URL = '/api/v1/assignments';

  let app: INestApplication;
  let prisma: PrismaService;
  let subjectId: string;
  let otherSubjectId: string;
  let topicId: string;
  let otherTopicId: string;
  let questionIds: string[] = [];
  let foreignQuestionId: string;
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

  const createGroup = async (token = teacher): Promise<GroupBody> => {
    const response = await request(app.getHttpServer())
      .post(`${TEACHER_URL}/groups`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Група', subjectId })
      .expect(201);
    return response.body as GroupBody;
  };

  const join = async (token: string, inviteCode: string): Promise<void> => {
    await request(app.getHttpServer())
      .post('/api/v1/groups/join')
      .set('Authorization', `Bearer ${token}`)
      .send({ inviteCode })
      .expect(200);
  };

  /** A group with both students already in it. */
  const groupWithStudents = async (): Promise<GroupBody> => {
    const group = await createGroup();
    await join(studentA, group.inviteCode);
    await join(studentB, group.inviteCode);
    return group;
  };

  const issue = async (
    groupId: string,
    body: Record<string, unknown> = {},
  ): Promise<AssignmentBody> => {
    const response = await request(app.getHttpServer())
      .post(`${TEACHER_URL}/groups/${groupId}/assignments`)
      .set('Authorization', `Bearer ${teacher}`)
      .send({
        title: 'Домашнє завдання',
        dueAt: IN_A_WEEK(),
        mode: 'MANUAL',
        questionIds: questionIds.slice(0, 3),
        ...body,
      })
      .expect(201);
    return response.body as AssignmentBody;
  };

  const removeFixtures = async (): Promise<void> => {
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
        name: 'Assignments fixture',
        slug: PREFIX,
        displayOrder: 9990,
        isPublished: true,
      },
      select: { id: true },
    });
    subjectId = subject.id;

    const other = await prisma.subject.upsert({
      where: { slug: `${PREFIX}-other` },
      update: { isPublished: true, deletedAt: null },
      create: {
        name: 'Other subject',
        slug: `${PREFIX}-other`,
        displayOrder: 9991,
        isPublished: true,
      },
      select: { id: true },
    });
    otherSubjectId = other.id;

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

    const otherTopic = await prisma.topic.upsert({
      where: {
        subjectId_slug: { subjectId: otherSubjectId, slug: `${PREFIX}-other` },
      },
      update: { isPublished: true, deletedAt: null },
      create: {
        subjectId: otherSubjectId,
        name: 'Чужа тема',
        slug: `${PREFIX}-other`,
        displayOrder: 1,
        isPublished: true,
      },
      select: { id: true },
    });
    otherTopicId = otherTopic.id;

    await prisma.question.deleteMany({
      where: { topicId: { in: [topicId, otherTopicId] } },
    });

    // Ten questions in the group's subject: six beginner, four advanced.
    questionIds = [];
    for (let index = 0; index < 10; index += 1) {
      const question = await prisma.question.create({
        data: {
          topicId,
          type: QuestionType.SINGLE_CHOICE,
          title: `Питання ${index}`,
          isPublished: true,
          difficulty: index < 6 ? Difficulty.BEGINNER : Difficulty.ADVANCED,
        },
        select: { id: true },
      });
      questionIds.push(question.id);
    }

    const foreign = await prisma.question.create({
      data: {
        topicId: otherTopicId,
        type: QuestionType.SINGLE_CHOICE,
        title: 'Чуже питання',
        isPublished: true,
      },
      select: { id: true },
    });
    foreignQuestionId = foreign.id;

    await removeFixtures();

    teacher = (await register(UserRole.TEACHER)).token;
    otherTeacher = (await register(UserRole.TEACHER)).token;
    const a = await register(UserRole.USER);
    studentA = a.token;
    studentAId = a.userId;
    const b = await register(UserRole.USER);
    studentB = b.token;
    studentBId = b.userId;
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

  describe('issuing', () => {
    it('freezes the questions and the recipients', async () => {
      const group = await groupWithStudents();

      const assignment = await issue(group.id);

      expect(assignment.questionCount).toBe(3);
      expect(assignment.targetCount).toBe(2);
      expect(assignment.submittedCount).toBe(0);
    });

    it('targets only the students named, when named', async () => {
      const group = await groupWithStudents();

      const assignment = await issue(group.id, { studentIds: [studentAId] });

      expect(assignment.targetCount).toBe(1);

      const forB = await request(app.getHttpServer())
        .get(STUDENT_URL)
        .set('Authorization', `Bearer ${studentB}`)
        .expect(200);
      const ids = (forB.body as StudentAssignmentBody[]).map((one) => one.id);
      expect(ids).not.toContain(assignment.id);
    });

    it('draws a whole topic when asked by topic', async () => {
      const group = await groupWithStudents();

      const assignment = await issue(group.id, {
        mode: 'TOPIC',
        topicId,
        count: 7,
        questionIds: undefined,
      });

      expect(assignment.questionCount).toBe(7);
    });

    it('honours a difficulty mix', async () => {
      const group = await groupWithStudents();

      const assignment = await issue(group.id, {
        mode: 'DIFFICULTY',
        topicId,
        beginner: 4,
        intermediate: 0,
        advanced: 2,
        questionIds: undefined,
      });

      expect(assignment.questionCount).toBe(6);
    });

    it('refuses to quietly issue fewer questions than asked for', async () => {
      const group = await groupWithStudents();

      await request(app.getHttpServer())
        .post(`${TEACHER_URL}/groups/${group.id}/assignments`)
        .set('Authorization', `Bearer ${teacher}`)
        .send({
          title: 'Забагато',
          dueAt: IN_A_WEEK(),
          mode: 'DIFFICULTY',
          topicId,
          beginner: 0,
          intermediate: 0,
          advanced: 99,
        })
        .expect(400);
    });

    it('refuses questions from another subject even when the ids are valid', async () => {
      const group = await groupWithStudents();

      await request(app.getHttpServer())
        .post(`${TEACHER_URL}/groups/${group.id}/assignments`)
        .set('Authorization', `Bearer ${teacher}`)
        .send({
          title: 'Чуже',
          dueAt: IN_A_WEEK(),
          mode: 'MANUAL',
          questionIds: [questionIds[0], foreignQuestionId],
        })
        .expect(400);
    });

    it('refuses a topic from another subject', async () => {
      const group = await groupWithStudents();

      await request(app.getHttpServer())
        .post(`${TEACHER_URL}/groups/${group.id}/assignments`)
        .set('Authorization', `Bearer ${teacher}`)
        .send({
          title: 'Чужа тема',
          dueAt: IN_A_WEEK(),
          mode: 'TOPIC',
          topicId: otherTopicId,
          count: 1,
        })
        .expect(400);
    });

    it('refuses a deadline in the past', async () => {
      const group = await groupWithStudents();

      await request(app.getHttpServer())
        .post(`${TEACHER_URL}/groups/${group.id}/assignments`)
        .set('Authorization', `Bearer ${teacher}`)
        .send({
          title: 'Учора',
          dueAt: new Date(Date.now() - 1000).toISOString(),
          mode: 'MANUAL',
          questionIds: questionIds.slice(0, 2),
        })
        .expect(400);
    });

    it('refuses a group with nobody in it', async () => {
      const empty = await createGroup();

      await request(app.getHttpServer())
        .post(`${TEACHER_URL}/groups/${empty.id}/assignments`)
        .set('Authorization', `Bearer ${teacher}`)
        .send({
          title: 'Нікому',
          dueAt: IN_A_WEEK(),
          mode: 'MANUAL',
          questionIds: questionIds.slice(0, 2),
        })
        .expect(409);
    });

    it('refuses an archived group', async () => {
      const group = await groupWithStudents();
      await request(app.getHttpServer())
        .post(`${TEACHER_URL}/groups/${group.id}/archive`)
        .set('Authorization', `Bearer ${teacher}`)
        .expect(201);

      await request(app.getHttpServer())
        .post(`${TEACHER_URL}/groups/${group.id}/assignments`)
        .set('Authorization', `Bearer ${teacher}`)
        .send({
          title: 'В архів',
          dueAt: IN_A_WEEK(),
          mode: 'MANUAL',
          questionIds: questionIds.slice(0, 2),
        })
        .expect(409);
    });

    it('refuses a student who is not in the group', async () => {
      const group = await createGroup();
      await join(studentA, group.inviteCode);

      await request(app.getHttpServer())
        .post(`${TEACHER_URL}/groups/${group.id}/assignments`)
        .set('Authorization', `Bearer ${teacher}`)
        .send({
          title: 'Стороннім',
          dueAt: IN_A_WEEK(),
          mode: 'MANUAL',
          questionIds: questionIds.slice(0, 2),
          studentIds: [studentBId],
        })
        .expect(400);
    });

    it('refuses another teacher issuing into the group', async () => {
      const group = await groupWithStudents();

      await request(app.getHttpServer())
        .post(`${TEACHER_URL}/groups/${group.id}/assignments`)
        .set('Authorization', `Bearer ${otherTeacher}`)
        .send({
          title: 'Чуже',
          dueAt: IN_A_WEEK(),
          mode: 'MANUAL',
          questionIds: questionIds.slice(0, 2),
        })
        .expect(404);
    });

    it('refuses a student issuing anything at all', async () => {
      const group = await groupWithStudents();

      await request(app.getHttpServer())
        .post(`${TEACHER_URL}/groups/${group.id}/assignments`)
        .set('Authorization', `Bearer ${studentA}`)
        .send({
          title: 'Сам собі',
          dueAt: IN_A_WEEK(),
          mode: 'MANUAL',
          questionIds: questionIds.slice(0, 2),
        })
        .expect(403);
    });
  });

  describe('the freeze holds', () => {
    it('does not reach a student who joined afterwards', async () => {
      const group = await createGroup();
      await join(studentA, group.inviteCode);

      const assignment = await issue(group.id);
      await join(studentB, group.inviteCode);

      const forB = await request(app.getHttpServer())
        .get(STUDENT_URL)
        .set('Authorization', `Bearer ${studentB}`)
        .expect(200);

      const ids = (forB.body as StudentAssignmentBody[]).map((one) => one.id);
      expect(ids).not.toContain(assignment.id);
    });

    it('stays with a student who left the group', async () => {
      const group = await createGroup();
      await join(studentA, group.inviteCode);
      const assignment = await issue(group.id);

      await request(app.getHttpServer())
        .delete(`/api/v1/groups/${group.id}/membership`)
        .set('Authorization', `Bearer ${studentA}`)
        .expect(204);

      const forA = await request(app.getHttpServer())
        .get(STUDENT_URL)
        .set('Authorization', `Bearer ${studentA}`)
        .expect(200);

      const ids = (forA.body as StudentAssignmentBody[]).map((one) => one.id);
      expect(ids).toContain(assignment.id);
    });
  });

  describe('editing', () => {
    it('moves the deadline', async () => {
      const group = await groupWithStudents();
      const assignment = await issue(group.id);
      const later = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

      const response = await request(app.getHttpServer())
        .patch(`${TEACHER_URL}/assignments/${assignment.id}`)
        .set('Authorization', `Bearer ${teacher}`)
        .send({ dueAt: later.toISOString() })
        .expect(200);

      expect(new Date((response.body as AssignmentBody).dueAt).getTime()).toBe(
        later.getTime(),
      );
    });

    it('rejects any attempt to change the question list', async () => {
      const group = await groupWithStudents();
      const assignment = await issue(group.id);

      await request(app.getHttpServer())
        .patch(`${TEACHER_URL}/assignments/${assignment.id}`)
        .set('Authorization', `Bearer ${teacher}`)
        .send({ questionIds: questionIds.slice(0, 9) })
        .expect(400);
    });

    it('rejects any attempt to change the recipients', async () => {
      const group = await groupWithStudents();
      const assignment = await issue(group.id, { studentIds: [studentAId] });

      await request(app.getHttpServer())
        .patch(`${TEACHER_URL}/assignments/${assignment.id}`)
        .set('Authorization', `Bearer ${teacher}`)
        .send({ studentIds: [studentAId, studentBId] })
        .expect(400);
    });

    it('is closed to another teacher', async () => {
      const group = await groupWithStudents();
      const assignment = await issue(group.id);

      await request(app.getHttpServer())
        .patch(`${TEACHER_URL}/assignments/${assignment.id}`)
        .set('Authorization', `Bearer ${otherTeacher}`)
        .send({ title: 'Викрадено' })
        .expect(404);
      await request(app.getHttpServer())
        .get(`${TEACHER_URL}/assignments/${assignment.id}`)
        .set('Authorization', `Bearer ${otherTeacher}`)
        .expect(404);
    });
  });

  describe('what the student sees', () => {
    it('lists it as open, with no attempts used', async () => {
      const group = await groupWithStudents();
      const assignment = await issue(group.id);

      const response = await request(app.getHttpServer())
        .get(`${STUDENT_URL}/${assignment.id}`)
        .set('Authorization', `Bearer ${studentA}`)
        .expect(200);

      const body = response.body as StudentAssignmentBody;
      expect(body.status).toBe('OPEN');
      expect(body.attemptsUsed).toBe(0);
      expect(body.late).toBe(false);
      expect(body.questionCount).toBe(3);
    });

    it('never sends the questions themselves', async () => {
      const group = await groupWithStudents();
      const assignment = await issue(group.id);

      const response = await request(app.getHttpServer())
        .get(`${STUDENT_URL}/${assignment.id}`)
        .set('Authorization', `Bearer ${studentA}`)
        .expect(200);

      const serialized = JSON.stringify(response.body);
      for (const questionId of questionIds.slice(0, 3)) {
        expect(serialized).not.toContain(questionId);
      }
      expect(serialized).not.toContain('Питання');
    });

    it('marks work scheduled before it opens', async () => {
      const group = await groupWithStudents();
      const assignment = await issue(group.id, {
        openAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });

      const response = await request(app.getHttpServer())
        .get(`${STUDENT_URL}/${assignment.id}`)
        .set('Authorization', `Bearer ${studentA}`)
        .expect(200);

      expect((response.body as StudentAssignmentBody).status).toBe('SCHEDULED');
    });

    it('marks work overdue once the deadline passes', async () => {
      const group = await groupWithStudents();
      const assignment = await issue(group.id);
      await prisma.assignment.update({
        where: { id: assignment.id },
        data: { dueAt: new Date(Date.now() - 1000) },
      });

      const response = await request(app.getHttpServer())
        .get(`${STUDENT_URL}/${assignment.id}`)
        .set('Authorization', `Bearer ${studentA}`)
        .expect(200);

      expect((response.body as StudentAssignmentBody).status).toBe('OVERDUE');
    });

    it('hides an assignment issued to somebody else', async () => {
      const group = await groupWithStudents();
      const assignment = await issue(group.id, { studentIds: [studentAId] });

      await request(app.getHttpServer())
        .get(`${STUDENT_URL}/${assignment.id}`)
        .set('Authorization', `Bearer ${studentB}`)
        .expect(404);
    });

    it('requires a token', async () => {
      await request(app.getHttpServer()).get(STUDENT_URL).expect(401);
    });
  });
});
