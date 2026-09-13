import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AccountStatus, QuestionType, UserRole } from '@prisma/client';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { listenOnLoopback } from './loopback';

interface DuelBody {
  id: string;
  status: string;
  questionCount: number;
  challenger: {
    id: string;
    score: { accuracy: number } | null;
    finished: boolean;
  };
  opponent: {
    id: string;
    score: { accuracy: number } | null;
    finished: boolean;
  };
  winner: string | null;
  mySessionId: string | null;
}

interface SessionBody {
  sessionId: string;
}

interface QuestionBody {
  id: string;
  answerOptions: { id: string; content: string }[];
}

/**
 * Asynchronous duels (docs/02-domain/duel.md).
 *
 * Both players sit the same frozen paper whenever they like; the result is a
 * comparison. What the tests are really about is fairness: the same questions
 * in the same order, no peeking at a score you have not earned yet, and a
 * winner decided on accuracy before speed.
 */
describe('Duels — asynchronous (e2e)', () => {
  const PREFIX = 'duel-e2e';
  const PASSWORD = 'ValidPass1!';
  const DUELS_URL = '/api/v1/duels';

  let app: INestApplication;
  let prisma: PrismaService;
  let subjectId: string;
  let topicId: string;
  let counter = 0;

  let alice: string;
  let aliceId: string;
  let aliceName: string;
  let bob: string;
  let bobId: string;
  let bobName: string;

  const register = async (): Promise<{
    token: string;
    userId: string;
    username: string;
  }> => {
    counter += 1;
    const email = `${PREFIX}-${counter}@example.com`;
    const username = `${PREFIX.replace(/-/g, '')}${counter}`;
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, username, password: PASSWORD })
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
      username,
    };
  };

  const challenge = (token: string, opponentUsername: string, extra = {}) =>
    request(app.getHttpServer())
      .post(DUELS_URL)
      .set('Authorization', `Bearer ${token}`)
      .send({
        opponentUsername,
        subjectId,
        topicId,
        questionCount: 4,
        ...extra,
      });

  /** Accepts, then returns the duel id. */
  const openDuel = async (): Promise<string> => {
    const created = await challenge(alice, bobName).expect(201);
    const duelId = (created.body as DuelBody).id;
    await request(app.getHttpServer())
      .post(`${DUELS_URL}/${duelId}/accept`)
      .set('Authorization', `Bearer ${bob}`)
      .expect(200);
    return duelId;
  };

  /** Plays one side, answering `correctCount` questions correctly. */
  const playSide = async (
    token: string,
    duelId: string,
    correctCount: number,
  ): Promise<string[]> => {
    const started = await request(app.getHttpServer())
      .post(`${DUELS_URL}/${duelId}/play`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const sessionId = (started.body as SessionBody).sessionId;

    const listed = await request(app.getHttpServer())
      .get(`/api/v1/quiz/${sessionId}/questions`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const questions = listed.body as QuestionBody[];

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

    return questions.map((one) => one.id);
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
      await prisma.duel.deleteMany({
        where: {
          OR: [
            { challengerId: { in: userIds } },
            { opponentId: { in: userIds } },
          ],
        },
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
        name: 'Duel fixture',
        slug: PREFIX,
        displayOrder: 9920,
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
    for (let index = 0; index < 8; index += 1) {
      await prisma.question.create({
        data: {
          topicId,
          type: QuestionType.SINGLE_CHOICE,
          title: `Питання ${index}`,
          explanation: 'Пояснення',
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

    const a = await register();
    alice = a.token;
    aliceId = a.userId;
    aliceName = a.username;
    const b = await register();
    bob = b.token;
    bobId = b.userId;
    bobName = b.username;
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
    await prisma.question.deleteMany({ where: { topicId } });
    await prisma.topic.deleteMany({ where: { id: topicId } });
    await prisma.subject.deleteMany({ where: { id: subjectId } });
    await app.close();
  });

  describe('challenging', () => {
    it('creates a pending challenge to a named opponent', async () => {
      const response = await challenge(alice, bobName).expect(201);

      const body = response.body as DuelBody;
      expect(body.status).toBe('PENDING');
      expect(body.challenger.id).toBe(aliceId);
      expect(body.opponent.id).toBe(bobId);
      expect(body.questionCount).toBe(4);
    });

    it('refuses an unknown opponent', async () => {
      await challenge(alice, 'nobodyhere').expect(404);
    });

    it('refuses challenging yourself', async () => {
      await challenge(alice, aliceName).expect(400);
    });

    it('does not freeze the paper until the challenge is accepted', async () => {
      const created = await challenge(alice, bobName).expect(201);

      const questions = await prisma.duelQuestion.count({
        where: { duelId: (created.body as DuelBody).id },
      });
      expect(questions).toBe(0);
    });

    it('refuses a topic without enough questions', async () => {
      await challenge(alice, bobName, { questionCount: 20 }).expect(409);
    });
  });

  describe('accepting and declining', () => {
    it('freezes one paper for both players when accepted', async () => {
      const duelId = await openDuel();

      const frozen = await prisma.duelQuestion.findMany({
        where: { duelId },
        orderBy: { order: 'asc' },
        select: { questionId: true, order: true },
      });
      expect(frozen).toHaveLength(4);
      expect(frozen.map((row) => row.order)).toEqual([0, 1, 2, 3]);
    });

    it('serves both players the same questions in the same order', async () => {
      const duelId = await openDuel();

      const aliceSaw = await playSide(alice, duelId, 4);
      const bobSaw = await playSide(bob, duelId, 4);

      expect(bobSaw).toEqual(aliceSaw);
    });

    it('lets only the challenged person answer the challenge', async () => {
      const created = await challenge(alice, bobName).expect(201);

      await request(app.getHttpServer())
        .post(`${DUELS_URL}/${(created.body as DuelBody).id}/accept`)
        .set('Authorization', `Bearer ${alice}`)
        .expect(409);
    });

    it('records a decline and refuses play afterwards', async () => {
      const created = await challenge(alice, bobName).expect(201);
      const duelId = (created.body as DuelBody).id;

      const declined = await request(app.getHttpServer())
        .post(`${DUELS_URL}/${duelId}/decline`)
        .set('Authorization', `Bearer ${bob}`)
        .expect(200);
      expect((declined.body as DuelBody).status).toBe('DECLINED');

      await request(app.getHttpServer())
        .post(`${DUELS_URL}/${duelId}/play`)
        .set('Authorization', `Bearer ${bob}`)
        .expect(409);
    });

    it('refuses an expired challenge', async () => {
      const created = await challenge(alice, bobName).expect(201);
      const duelId = (created.body as DuelBody).id;
      await prisma.duel.update({
        where: { id: duelId },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });

      await request(app.getHttpServer())
        .post(`${DUELS_URL}/${duelId}/accept`)
        .set('Authorization', `Bearer ${bob}`)
        .expect(409);
    });

    it('refuses to play before the challenge is accepted', async () => {
      const created = await challenge(alice, bobName).expect(201);

      await request(app.getHttpServer())
        .post(`${DUELS_URL}/${(created.body as DuelBody).id}/play`)
        .set('Authorization', `Bearer ${alice}`)
        .expect(409);
    });
  });

  describe('playing', () => {
    it('resumes rather than starting a second half', async () => {
      const duelId = await openDuel();

      const first = await request(app.getHttpServer())
        .post(`${DUELS_URL}/${duelId}/play`)
        .set('Authorization', `Bearer ${alice}`)
        .expect(200);
      const second = await request(app.getHttpServer())
        .post(`${DUELS_URL}/${duelId}/play`)
        .set('Authorization', `Bearer ${alice}`)
        .expect(200);

      expect((second.body as SessionBody).sessionId).toBe(
        (first.body as SessionBody).sessionId,
      );
    });

    it('refuses a second run once finished', async () => {
      const duelId = await openDuel();
      await playSide(alice, duelId, 4);

      await request(app.getHttpServer())
        .post(`${DUELS_URL}/${duelId}/play`)
        .set('Authorization', `Bearer ${alice}`)
        .expect(409);
    });

    it('is closed to somebody who is not in the duel', async () => {
      const duelId = await openDuel();
      const stranger = await register();

      await request(app.getHttpServer())
        .get(`${DUELS_URL}/${duelId}`)
        .set('Authorization', `Bearer ${stranger.token}`)
        .expect(404);
    });
  });

  describe('the result', () => {
    it('hides a score until both have finished', async () => {
      const duelId = await openDuel();
      await playSide(alice, duelId, 4);

      const response = await request(app.getHttpServer())
        .get(`${DUELS_URL}/${duelId}`)
        .set('Authorization', `Bearer ${bob}`)
        .expect(200);

      const body = response.body as DuelBody;
      // Alice is done, but Bob must not see what he has to beat.
      expect(body.challenger.finished).toBe(true);
      expect(body.challenger.score).toBeNull();
      expect(body.winner).toBeNull();
    });

    it('reveals both scores and the winner once both are done', async () => {
      const duelId = await openDuel();
      await playSide(alice, duelId, 4);
      await playSide(bob, duelId, 2);

      const response = await request(app.getHttpServer())
        .get(`${DUELS_URL}/${duelId}`)
        .set('Authorization', `Bearer ${bob}`)
        .expect(200);

      const body = response.body as DuelBody;
      expect(body.status).toBe('COMPLETED');
      expect(body.challenger.score?.accuracy).toBe(100);
      expect(body.opponent.score?.accuracy).toBe(50);
      expect(body.winner).toBe('CHALLENGER');
    });

    it('calls it a draw on equal accuracy and equal time', async () => {
      const duelId = await openDuel();
      await playSide(alice, duelId, 3);
      await playSide(bob, duelId, 3);

      // Times are whatever the run took; equalise them so the tie-break has
      // nothing to separate.
      await prisma.quizSession.updateMany({
        where: { duelId },
        data: { durationSeconds: 42 },
      });

      const response = await request(app.getHttpServer())
        .get(`${DUELS_URL}/${duelId}`)
        .set('Authorization', `Bearer ${alice}`)
        .expect(200);

      expect((response.body as DuelBody).winner).toBe('DRAW');
    });

    it('breaks a tie on time, but only after accuracy', async () => {
      const duelId = await openDuel();
      await playSide(alice, duelId, 3);
      await playSide(bob, duelId, 3);

      const sessions = await prisma.quizSession.findMany({
        where: { duelId },
        select: { id: true, userId: true },
      });
      for (const session of sessions) {
        await prisma.quizSession.update({
          where: { id: session.id },
          data: { durationSeconds: session.userId === bobId ? 10 : 90 },
        });
      }

      const response = await request(app.getHttpServer())
        .get(`${DUELS_URL}/${duelId}`)
        .set('Authorization', `Bearer ${alice}`)
        .expect(200);

      expect((response.body as DuelBody).winner).toBe('OPPONENT');
    });

    it('lists a duel for both players', async () => {
      const duelId = await openDuel();

      for (const token of [alice, bob]) {
        const response = await request(app.getHttpServer())
          .get(DUELS_URL)
          .set('Authorization', `Bearer ${token}`)
          .expect(200);
        expect(
          (response.body as DuelBody[]).some((one) => one.id === duelId),
        ).toBe(true);
      }
    });

    it('marks a stale challenge expired when the list is read', async () => {
      const created = await challenge(alice, bobName).expect(201);
      const duelId = (created.body as DuelBody).id;
      await prisma.duel.update({
        where: { id: duelId },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });

      const response = await request(app.getHttpServer())
        .get(DUELS_URL)
        .set('Authorization', `Bearer ${alice}`)
        .expect(200);

      const listed = (response.body as DuelBody[]).find(
        (one) => one.id === duelId,
      );
      expect(listed?.status).toBe('EXPIRED');
    });
  });
});
