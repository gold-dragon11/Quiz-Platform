import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AccountStatus, QuestionType, UserRole } from '@prisma/client';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { listenOnLoopback } from './loopback';

interface SessionBody {
  sessionId: string;
}

interface QuestionBody {
  id: string;
  answerOptions: { id: string; content: string }[];
}

/**
 * Exposure history (docs/00-overview/teacher-side-decisions.md decision 15).
 *
 * The problem being solved: a topic holds roughly 41 questions and a sitting
 * takes ten, so without memory of what has been shown, the fourth practice run
 * stops testing the topic and starts testing recall of those particular items.
 *
 * The rule degrades rather than fails — a learner who has exhausted a topic
 * still gets a quiz, made of what they saw longest ago.
 */
describe('Question exposure (e2e)', () => {
  const PREFIX = 'exposure-e2e';
  const PASSWORD = 'ValidPass1!';
  const TOTAL_QUESTIONS = 12;
  const PER_SITTING = 4;

  let app: INestApplication;
  let prisma: PrismaService;
  let subjectId: string;
  let topicId: string;
  let questionIds: string[] = [];
  let counter = 0;

  const register = async (): Promise<{ token: string; userId: string }> => {
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
      data: { accountStatus: AccountStatus.ACTIVE, role: UserRole.USER },
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

  /** One practice run: start, read the paper, finish. Returns the question ids. */
  const sitting = async (token: string): Promise<string[]> => {
    const started = await request(app.getHttpServer())
      .post('/api/v1/quiz/start')
      .set('Authorization', `Bearer ${token}`)
      .send({
        subjectId,
        topicId,
        questionCount: PER_SITTING,
        timerEnabled: false,
      })
      .expect(201);
    const sessionId = (started.body as SessionBody).sessionId;

    const listed = await request(app.getHttpServer())
      .get(`/api/v1/quiz/${sessionId}/questions`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    await request(app.getHttpServer())
      .post(`/api/v1/quiz/${sessionId}/complete`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    return (listed.body as QuestionBody[]).map((one) => one.id);
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
        name: 'Exposure fixture',
        slug: PREFIX,
        displayOrder: 9960,
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
    for (let index = 0; index < TOTAL_QUESTIONS; index += 1) {
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
  });

  afterAll(async () => {
    await removeFixtures();
    await prisma.question.deleteMany({ where: { topicId } });
    await prisma.topic.deleteMany({ where: { id: topicId } });
    await prisma.subject.deleteMany({ where: { id: subjectId } });
    await app.close();
  });

  it('records every question it shows', async () => {
    const learner = await register();

    const shown = await sitting(learner.token);

    const recorded = await prisma.questionExposure.findMany({
      where: { userId: learner.userId },
      select: { questionId: true },
    });

    expect(recorded).toHaveLength(PER_SITTING);
    expect(new Set(recorded.map((row) => row.questionId))).toEqual(
      new Set(shown),
    );
  });

  it('works through the whole topic before repeating anything', async () => {
    const learner = await register();
    const seen: string[] = [];

    // Three sittings of four cover all twelve — with no repeats if the rule holds.
    for (let round = 0; round < TOTAL_QUESTIONS / PER_SITTING; round += 1) {
      seen.push(...(await sitting(learner.token)));
    }

    expect(seen).toHaveLength(TOTAL_QUESTIONS);
    expect(new Set(seen).size).toBe(TOTAL_QUESTIONS);
  });

  it('keeps working once the topic is exhausted', async () => {
    const learner = await register();
    for (let round = 0; round < TOTAL_QUESTIONS / PER_SITTING; round += 1) {
      await sitting(learner.token);
    }

    // Everything has been seen; the quiz must still be served.
    const fourth = await sitting(learner.token);

    expect(fourth).toHaveLength(PER_SITTING);
  });

  it('prefers the longest-unseen once everything has been seen', async () => {
    const learner = await register();
    const firstRound = await sitting(learner.token);
    for (let round = 1; round < TOTAL_QUESTIONS / PER_SITTING; round += 1) {
      await sitting(learner.token);
    }

    const next = await sitting(learner.token);

    // The four oldest exposures are exactly the first sitting.
    expect(new Set(next)).toEqual(new Set(firstRound));
  });

  it("reads only the caller's own history, not everyone's", async () => {
    // One learner works through the entire topic, oldest sitting first.
    const veteran = await register();
    const veteranFirstSitting = [...(await sitting(veteran.token))].sort();
    for (let round = 1; round < TOTAL_QUESTIONS / PER_SITTING; round += 1) {
      await sitting(veteran.token);
    }

    // If the lookup forgot to filter by learner, every question would carry the
    // veteran's timestamp for a newcomer too, and the ordering would hand each
    // newcomer the veteran's oldest four — deterministically.
    //
    // Each newcomer's own exposures are cleared between trials, so the trials
    // stay independent. Without that, the first newcomer's sitting would push
    // those questions to the back and the next would draw something else even
    // with the bug present — which is exactly how an earlier version of this
    // test passed against a deliberately broken query.
    const draws: string[] = [];
    for (let trial = 0; trial < 5; trial += 1) {
      const newcomer = await register();
      draws.push([...(await sitting(newcomer.token))].sort().join(','));
      await prisma.questionExposure.deleteMany({
        where: { userId: newcomer.userId },
      });
    }

    const leaked = veteranFirstSitting.join(',');
    expect(draws.some((draw) => draw !== leaked)).toBe(true);
  });

  it('does not filter mistake practice — that pool is the point', async () => {
    const learner = await register();

    const started = await request(app.getHttpServer())
      .post('/api/v1/quiz/start')
      .set('Authorization', `Bearer ${learner.token}`)
      .send({
        subjectId,
        topicId,
        questionCount: 2,
        timerEnabled: false,
      })
      .expect(201);
    const sessionId = (started.body as SessionBody).sessionId;

    const listed = await request(app.getHttpServer())
      .get(`/api/v1/quiz/${sessionId}/questions`)
      .set('Authorization', `Bearer ${learner.token}`)
      .expect(200);
    const questions = listed.body as QuestionBody[];

    for (const question of questions) {
      const wrong = question.answerOptions.find(
        (option) => option.content === 'Хибна',
      );
      await request(app.getHttpServer())
        .post(`/api/v1/quiz/${sessionId}/answers`)
        .set('Authorization', `Bearer ${learner.token}`)
        .send({
          questionId: question.id,
          selectedAnswer: { answerOptionId: wrong?.id },
        })
        .expect(200);
    }
    await request(app.getHttpServer())
      .post(`/api/v1/quiz/${sessionId}/complete`)
      .set('Authorization', `Bearer ${learner.token}`)
      .expect(200);

    // Those two questions are now both seen and wrong. Mistake practice must
    // still return them, or the feature has nothing to work with.
    const practice = await request(app.getHttpServer())
      .post('/api/v1/quiz/start')
      .set('Authorization', `Bearer ${learner.token}`)
      .send({
        subjectId,
        topicId,
        questionCount: 2,
        timerEnabled: false,
        onlyMistakes: true,
      })
      .expect(201);

    const practiceQuestions = await request(app.getHttpServer())
      .get(`/api/v1/quiz/${(practice.body as SessionBody).sessionId}/questions`)
      .set('Authorization', `Bearer ${learner.token}`)
      .expect(200);

    expect(
      new Set((practiceQuestions.body as QuestionBody[]).map((q) => q.id)),
    ).toEqual(new Set(questions.map((q) => q.id)));
  });
});
