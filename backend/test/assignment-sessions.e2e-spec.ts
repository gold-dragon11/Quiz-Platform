import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  AccountStatus,
  ExplanationVisibility,
  QuestionType,
  UserRole,
} from '@prisma/client';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { listenOnLoopback } from './loopback';

interface SessionBody {
  sessionId: string;
  questionCount: number;
  timerEnabled: boolean;
  expiresAt: string | null;
}

interface QuestionBody {
  id: string;
  title: string;
  answerOptions: { id: string; content: string }[];
}

interface ReviewBody {
  questions: { explanation: string | null }[];
}

const IN_A_WEEK = (): string =>
  new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

/**
 * Doing an assignment, end to end (docs/02-domain/assignment.md §7).
 *
 * Two things are being proved here. First, that homework runs through the
 * existing engine rather than a parallel one — same questions route, same
 * answers route, same review. Second, the concurrency rule from decision 13:
 * homework is limited per subject, self-study separately, and the two do not
 * block each other.
 */
describe('Assignment sessions (e2e)', () => {
  const PREFIX = 'asession-e2e';
  const PASSWORD = 'ValidPass1!';

  let app: INestApplication;
  let prisma: PrismaService;
  let mathsId: string;
  let englishId: string;
  let mathsTopicId: string;
  let englishTopicId: string;
  let mathsQuestionIds: string[] = [];
  let englishQuestionIds: string[] = [];
  let counter = 0;

  let teacher: string;
  let student: string;
  let studentId: string;

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

  /** A group in one subject with the student already in it. */
  const groupIn = async (subjectId: string): Promise<string> => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/teacher/groups')
      .set('Authorization', `Bearer ${teacher}`)
      .send({ name: 'Група', subjectId })
      .expect(201);
    const group = created.body as { id: string; inviteCode: string };

    await request(app.getHttpServer())
      .post('/api/v1/groups/join')
      .set('Authorization', `Bearer ${student}`)
      .send({ inviteCode: group.inviteCode })
      .expect(200);

    return group.id;
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

  const startAssignment = async (
    assignmentId: string,
  ): Promise<SessionBody> => {
    const response = await request(app.getHttpServer())
      .post(`/api/v1/assignments/${assignmentId}/start`)
      .set('Authorization', `Bearer ${student}`)
      .expect(200);
    return response.body as SessionBody;
  };

  /** Answers every question correctly and completes the session. */
  const completeSession = async (sessionId: string): Promise<void> => {
    const listed = await request(app.getHttpServer())
      .get(`/api/v1/quiz/${sessionId}/questions`)
      .set('Authorization', `Bearer ${student}`)
      .expect(200);

    for (const question of listed.body as QuestionBody[]) {
      await request(app.getHttpServer())
        .post(`/api/v1/quiz/${sessionId}/answers`)
        .set('Authorization', `Bearer ${student}`)
        .send({
          questionId: question.id,
          selectedAnswer: { answerOptionId: question.answerOptions[0].id },
        })
        .expect(200);
    }

    await request(app.getHttpServer())
      .post(`/api/v1/quiz/${sessionId}/complete`)
      .set('Authorization', `Bearer ${student}`)
      .expect(200);
  };

  const ensureSubject = async (
    slug: string,
    order: number,
  ): Promise<{ subjectId: string; topicId: string }> => {
    const subject = await prisma.subject.upsert({
      where: { slug },
      update: { isPublished: true, deletedAt: null },
      create: { name: slug, slug, displayOrder: order, isPublished: true },
      select: { id: true },
    });
    const topic = await prisma.topic.upsert({
      where: { subjectId_slug: { subjectId: subject.id, slug } },
      update: { isPublished: true, deletedAt: null },
      create: {
        subjectId: subject.id,
        name: slug,
        slug,
        displayOrder: 1,
        isPublished: true,
      },
      select: { id: true },
    });
    return { subjectId: subject.id, topicId: topic.id };
  };

  /**
   * Questions are replaced only after the fixtures that reference them are
   * gone: an AssignmentQuestion pins its Question, which is the whole point of
   * the frozen list.
   */
  const seedQuestions = async (
    topicId: string,
    slug: string,
  ): Promise<string[]> => {
    await prisma.question.deleteMany({ where: { topicId } });
    const questionIds: string[] = [];
    for (let index = 0; index < 4; index += 1) {
      const question = await prisma.question.create({
        data: {
          topicId,
          type: QuestionType.SINGLE_CHOICE,
          title: `${slug} питання ${index}`,
          explanation: `Пояснення ${index}`,
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
    return questionIds;
  };

  /**
   * Order matters here, and the reason is a product decision rather than a
   * test detail: a QuizSession references its Assignment with `Restrict`, so an
   * assignment students have actually worked on cannot be deleted out from
   * under their results. The fixtures have to come down the same way real data
   * would — sessions first, then the assignment they belonged to.
   */
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
      where: { group: { subjectId: { in: [mathsId, englishId] } } },
    });
    await prisma.group.deleteMany({
      where: { subjectId: { in: [mathsId, englishId] } },
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

    const maths = await ensureSubject(`${PREFIX}-maths`, 9980);
    mathsId = maths.subjectId;
    mathsTopicId = maths.topicId;

    const english = await ensureSubject(`${PREFIX}-english`, 9981);
    englishId = english.subjectId;
    englishTopicId = english.topicId;

    // Before the questions: leftovers from an interrupted run still reference
    // them through assignment_questions.
    await removeFixtures();

    mathsQuestionIds = await seedQuestions(mathsTopicId, `${PREFIX}-maths`);
    englishQuestionIds = await seedQuestions(
      englishTopicId,
      `${PREFIX}-english`,
    );
    teacher = (await register(UserRole.TEACHER)).token;
    const registered = await register(UserRole.USER);
    student = registered.token;
    studentId = registered.userId;
  });

  /**
   * The suite reuses one student, and an unfinished session is exactly what the
   * concurrency rule is supposed to block — so without this every test after
   * the first would fail on the previous test's leftovers rather than on its
   * own subject. Only ACTIVE sessions go: completed ones are the attempt
   * history several tests depend on.
   */
  afterEach(async () => {
    const active = await prisma.quizSession.findMany({
      where: { user: { email: { startsWith: PREFIX } }, status: 'ACTIVE' },
      select: { id: true },
    });
    const ids = active.map((session) => session.id);
    if (ids.length === 0) {
      return;
    }
    await prisma.questionAttempt.deleteMany({
      where: { quizSessionId: { in: ids } },
    });
    await prisma.quizSession.deleteMany({ where: { id: { in: ids } } });
  });

  afterAll(async () => {
    await removeFixtures();
    await prisma.question.deleteMany({
      where: { topicId: { in: [mathsTopicId, englishTopicId] } },
    });
    await prisma.topic.deleteMany({
      where: { id: { in: [mathsTopicId, englishTopicId] } },
    });
    await prisma.subject.deleteMany({
      where: { id: { in: [mathsId, englishId] } },
    });
    await app.close();
  });

  describe('running the work', () => {
    it('serves exactly the frozen question list, untimed', async () => {
      const group = await groupIn(mathsId);
      const assignment = await issue(group, mathsQuestionIds.slice(0, 3));

      const session = await startAssignment(assignment);

      expect(session.questionCount).toBe(3);
      expect(session.timerEnabled).toBe(false);
      expect(session.expiresAt).toBeNull();

      const listed = await request(app.getHttpServer())
        .get(`/api/v1/quiz/${session.sessionId}/questions`)
        .set('Authorization', `Bearer ${student}`)
        .expect(200);

      const served = (listed.body as QuestionBody[]).map((one) => one.id);
      expect(served).toEqual(mathsQuestionIds.slice(0, 3));
    });

    it('resumes rather than starting again', async () => {
      const group = await groupIn(mathsId);
      const assignment = await issue(group, mathsQuestionIds.slice(0, 2));

      const first = await startAssignment(assignment);
      const second = await startAssignment(assignment);

      expect(second.sessionId).toBe(first.sessionId);
    });

    it('counts the attempt once completed and refuses a second one', async () => {
      const group = await groupIn(mathsId);
      const assignment = await issue(group, mathsQuestionIds.slice(0, 2));

      const session = await startAssignment(assignment);
      await completeSession(session.sessionId);

      const detail = await request(app.getHttpServer())
        .get(`/api/v1/assignments/${assignment}`)
        .set('Authorization', `Bearer ${student}`)
        .expect(200);
      expect(
        (detail.body as { attemptsUsed: number; status: string }).attemptsUsed,
      ).toBe(1);
      expect((detail.body as { status: string }).status).toBe('SUBMITTED');

      await request(app.getHttpServer())
        .post(`/api/v1/assignments/${assignment}/start`)
        .set('Authorization', `Bearer ${student}`)
        .expect(409);
    });

    it('allows a second attempt when the teacher permitted one', async () => {
      const group = await groupIn(mathsId);
      const assignment = await issue(group, mathsQuestionIds.slice(0, 2), {
        attemptsAllowed: 2,
      });

      const first = await startAssignment(assignment);
      await completeSession(first.sessionId);

      const second = await startAssignment(assignment);
      expect(second.sessionId).not.toBe(first.sessionId);
    });

    it('refuses before the opening date', async () => {
      const group = await groupIn(mathsId);
      const assignment = await issue(group, mathsQuestionIds.slice(0, 2), {
        openAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      });

      await request(app.getHttpServer())
        .post(`/api/v1/assignments/${assignment}/start`)
        .set('Authorization', `Bearer ${student}`)
        .expect(409);
    });

    it('still allows late work after the deadline', async () => {
      const group = await groupIn(mathsId);
      const assignment = await issue(group, mathsQuestionIds.slice(0, 2));
      await prisma.assignment.update({
        where: { id: assignment },
        data: { dueAt: new Date(Date.now() - 1000) },
      });

      const session = await startAssignment(assignment);
      await completeSession(session.sessionId);

      const detail = await request(app.getHttpServer())
        .get(`/api/v1/assignments/${assignment}`)
        .set('Authorization', `Bearer ${student}`)
        .expect(200);

      expect((detail.body as { late: boolean }).late).toBe(true);
    });

    it('refuses somebody who was not given the assignment', async () => {
      const group = await groupIn(mathsId);
      const assignment = await issue(group, mathsQuestionIds.slice(0, 2));
      const stranger = await register(UserRole.USER);

      await request(app.getHttpServer())
        .post(`/api/v1/assignments/${assignment}/start`)
        .set('Authorization', `Bearer ${stranger.token}`)
        .expect(404);
    });
  });

  describe('concurrency (decision 13)', () => {
    it('blocks a second assignment in the same subject', async () => {
      const group = await groupIn(mathsId);
      const first = await issue(group, mathsQuestionIds.slice(0, 2));
      const second = await issue(group, mathsQuestionIds.slice(2, 4));

      await startAssignment(first);

      await request(app.getHttpServer())
        .post(`/api/v1/assignments/${second}/start`)
        .set('Authorization', `Bearer ${student}`)
        .expect(409);
    });

    it('allows homework in another subject at the same time', async () => {
      const mathsGroup = await groupIn(mathsId);
      const englishGroup = await groupIn(englishId);
      const mathsWork = await issue(mathsGroup, mathsQuestionIds.slice(0, 2));
      const englishWork = await issue(
        englishGroup,
        englishQuestionIds.slice(0, 2),
      );

      const first = await startAssignment(mathsWork);
      const second = await startAssignment(englishWork);

      expect(second.sessionId).not.toBe(first.sessionId);
    });

    it('lets self-study run alongside unfinished homework', async () => {
      const group = await groupIn(mathsId);
      const assignment = await issue(group, mathsQuestionIds.slice(0, 2));
      await startAssignment(assignment);

      // Open homework is not the session the start screens warn about: the
      // resume banner reads this, and counting homework here made every start
      // screen claim nothing new could begin.
      const active = await request(app.getHttpServer())
        .get('/api/v1/quiz/active')
        .set('Authorization', `Bearer ${student}`)
        .expect(200);
      expect((active.body as { session: unknown }).session).toBeNull();

      await request(app.getHttpServer())
        .post('/api/v1/quiz/start')
        .set('Authorization', `Bearer ${student}`)
        .send({
          subjectId: mathsId,
          questionCount: 2,
          timerEnabled: false,
        })
        .expect(201);
    });

    it('still allows only one self-study session at a time', async () => {
      const fresh = await register(UserRole.USER);
      const body = {
        subjectId: mathsId,
        questionCount: 2,
        timerEnabled: false,
      };

      await request(app.getHttpServer())
        .post('/api/v1/quiz/start')
        .set('Authorization', `Bearer ${fresh.token}`)
        .send(body)
        .expect(201);
      await request(app.getHttpServer())
        .post('/api/v1/quiz/start')
        .set('Authorization', `Bearer ${fresh.token}`)
        .send(body)
        .expect(409);
    });
  });

  describe('explanations', () => {
    it('shows them after submission by default', async () => {
      const group = await groupIn(mathsId);
      const assignment = await issue(group, mathsQuestionIds.slice(0, 2));
      const session = await startAssignment(assignment);
      await completeSession(session.sessionId);

      const review = await request(app.getHttpServer())
        .get(`/api/v1/quiz/${session.sessionId}/result`)
        .set('Authorization', `Bearer ${student}`)
        .expect(200);

      const explanations = (review.body as ReviewBody).questions.map(
        (one) => one.explanation,
      );
      expect(explanations.every((one) => one !== null)).toBe(true);
    });

    it('withholds them until the deadline when the teacher said so', async () => {
      const group = await groupIn(mathsId);
      const assignment = await issue(group, mathsQuestionIds.slice(0, 2), {
        explanations: ExplanationVisibility.AFTER_DUE,
      });
      const session = await startAssignment(assignment);
      await completeSession(session.sessionId);

      const before = await request(app.getHttpServer())
        .get(`/api/v1/quiz/${session.sessionId}/result`)
        .set('Authorization', `Bearer ${student}`)
        .expect(200);
      expect(
        (before.body as ReviewBody).questions.every(
          (one) => one.explanation === null,
        ),
      ).toBe(true);

      await prisma.assignment.update({
        where: { id: assignment },
        data: { dueAt: new Date(Date.now() - 1000) },
      });

      const after = await request(app.getHttpServer())
        .get(`/api/v1/quiz/${session.sessionId}/result`)
        .set('Authorization', `Bearer ${student}`)
        .expect(200);
      expect(
        (after.body as ReviewBody).questions.every(
          (one) => one.explanation !== null,
        ),
      ).toBe(true);
    });

    it('never withholds them from self-study', async () => {
      const fresh = await register(UserRole.USER);
      const started = await request(app.getHttpServer())
        .post('/api/v1/quiz/start')
        .set('Authorization', `Bearer ${fresh.token}`)
        .send({ subjectId: mathsId, questionCount: 2, timerEnabled: false })
        .expect(201);
      const sessionId = (started.body as SessionBody).sessionId;

      await request(app.getHttpServer())
        .post(`/api/v1/quiz/${sessionId}/complete`)
        .set('Authorization', `Bearer ${fresh.token}`)
        .expect(200);

      const review = await request(app.getHttpServer())
        .get(`/api/v1/quiz/${sessionId}/result`)
        .set('Authorization', `Bearer ${fresh.token}`)
        .expect(200);

      expect(
        (review.body as ReviewBody).questions.some(
          (one) => one.explanation !== null,
        ),
      ).toBe(true);
    });
  });

  it('keeps the student id off every response body', async () => {
    const group = await groupIn(mathsId);
    const assignment = await issue(group, mathsQuestionIds.slice(0, 2));
    const session = await startAssignment(assignment);

    expect(JSON.stringify(session)).not.toContain(studentId);
  });
});
