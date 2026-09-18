import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AccountStatus, QuestionType, UserRole } from '@prisma/client';
import type { AddressInfo } from 'node:net';
import { io, type Socket } from 'socket.io-client';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import type { LiveClock } from './../src/duels/live/live-game';
import { LIVE_CLOCK } from './../src/duels/live/live-games.service';
import type { LiveGameView } from './../src/duels/live/live.types';
import { PrismaService } from './../src/prisma/prisma.service';
import { listenOnLoopback } from './loopback';

/**
 * The game's clock, twenty times faster: a ten-second question lasts half a
 * second, the thirty-second invite a second and a half. Every deadline is
 * still set and checked by the server on this one clock, so what is tested is
 * the real game — only shorter.
 */
const SPEED = 20;
const fastClock = (): LiveClock => {
  const origin = Date.now();
  return {
    now: () => origin + (Date.now() - origin) * SPEED,
    schedule: (ms, task) => {
      const handle = setTimeout(task, ms / SPEED);
      return () => clearTimeout(handle);
    },
  };
};

interface Player {
  token: string;
  userId: string;
  username: string;
  email: string;
}

interface Ack {
  ok: boolean;
  code?: string;
  message?: string;
  [key: string]: unknown;
}

/**
 * Live duels (docs/02-domain/duel.md §5).
 *
 * Two real socket clients against the running app: finding each other, the
 * game on the server's clock, the first answer standing, the reveal, the
 * result written through the quiz engine — and the doors that must stay shut:
 * no token, a demo account, the ordinary quiz routes during a game.
 */
describe('Duels — live (e2e)', () => {
  const PREFIX = 'duel-live-e2e';
  const PASSWORD = 'ValidPass1!';
  const SHORT_QUESTIONS = 12;

  let app: INestApplication;
  let prisma: PrismaService;
  let baseUrl: string;
  let subjectId: string;
  let topicId: string;
  let counter = 0;
  const sockets: Socket[] = [];

  const register = async (): Promise<Player> => {
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
      email,
    };
  };

  /** A connected socket, once the server has said it is ready. */
  const connect = async (token: string | undefined): Promise<Socket> => {
    const socket = io(`${baseUrl}/live`, {
      auth: token === undefined ? {} : { token },
      transports: ['websocket'],
      forceNew: true,
      reconnection: false,
    });
    sockets.push(socket);
    await new Promise<void>((resolve, reject) => {
      socket.once('live:ready', () => resolve());
      socket.once('live:refused', (body: { code: string }) =>
        reject(new Error(body.code)),
      );
      socket.once('connect_error', reject);
    });
    return socket;
  };

  const send = (socket: Socket, event: string, body?: unknown): Promise<Ack> =>
    socket.timeout(5000).emitWithAck(event, body) as Promise<Ack>;

  /** The next event matching `accept`, or a failure after `ms`. */
  const next = <T>(
    socket: Socket,
    event: string,
    accept: (payload: T) => boolean = () => true,
    ms = 8000,
  ): Promise<T> =>
    new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        socket.off(event, listener);
        reject(new Error(`No ${event} within ${ms} ms`));
      }, ms);
      const listener = (payload: T): void => {
        if (accept(payload)) {
          clearTimeout(timer);
          socket.off(event, listener);
          resolve(payload);
        }
      };
      socket.on(event, listener);
    });

  const game = (socket: Socket, accept: (view: LiveGameView) => boolean) =>
    next<LiveGameView>(socket, 'live:game', accept);

  // The subject is filled in once the fixture exists.
  const settings = { subjectId: '', seconds: 10, count: 5 };

  /** The id of the right (or wrong) option of the question in a view. */
  const option = async (
    view: LiveGameView,
    right: boolean,
  ): Promise<string> => {
    const found = await prisma.answerOption.findFirstOrThrow({
      where: { questionId: view.question!.id, isCorrect: right },
      select: { id: true },
    });
    return found.id;
  };

  /** Invites and accepts; resolves once both are on the countdown. */
  const startByInvite = async (
    from: Socket,
    to: Socket,
    toName: string,
  ): Promise<void> => {
    const incoming = next<{ inviteId: string }>(to, 'live:invite:incoming');
    const sent = await send(from, 'live:invite:send', {
      username: toName,
      ...settings,
      subjectId,
    });
    expect(sent.ok).toBe(true);
    const { inviteId } = await incoming;
    const bothCounting = Promise.all([
      game(from, (view) => view.phase === 'countdown'),
      game(to, (view) => view.phase === 'countdown'),
    ]);
    expect(
      (await send(to, 'live:invite:respond', { inviteId, accept: true })).ok,
    ).toBe(true);
    await bothCounting;
  };

  const closeSockets = (): void => {
    for (const socket of sockets.splice(0)) {
      socket.disconnect();
    }
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
    })
      .overrideProvider(LIVE_CLOCK)
      .useValue(fastClock())
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
    await listenOnLoopback(app);
    prisma = app.get(PrismaService);
    const { port } = (
      app.getHttpServer() as { address(): AddressInfo }
    ).address();
    baseUrl = `http://127.0.0.1:${port}`;

    const subject = await prisma.subject.upsert({
      where: { slug: PREFIX },
      update: { isPublished: true, deletedAt: null },
      create: {
        name: 'Live duel fixture',
        slug: PREFIX,
        displayOrder: 9921,
        isPublished: true,
      },
      select: { id: true },
    });
    subjectId = subject.id;
    settings.subjectId = subjectId;

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
    const create = (title: string) =>
      prisma.question.create({
        data: {
          topicId,
          type: QuestionType.SINGLE_CHOICE,
          title,
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
    for (let index = 0; index < SHORT_QUESTIONS; index += 1) {
      await create(`Питання ${index}`);
    }
    // Too long to read in 30 seconds; fine for 45.
    await create(`Довге питання. ${'Слово '.repeat(66)}`);
  });

  afterEach(async () => {
    closeSockets();
    // Let the server see the disconnects before the next test connects.
    await new Promise((resolve) => setTimeout(resolve, 100));
    await removeFixtures();
  });

  afterAll(async () => {
    await prisma.question.deleteMany({ where: { topicId } });
    await prisma.topic.deleteMany({ where: { id: topicId } });
    await prisma.subject.deleteMany({ where: { id: subjectId } });
    await app.close();
  });

  describe('availability', () => {
    it('counts, for each time, the questions that can be done in it', async () => {
      const alice = await register();
      const response = await request(app.getHttpServer())
        .get('/api/v1/duels/live/availability')
        .query({ subjectId })
        .set('Authorization', `Bearer ${alice.token}`)
        .expect(200);

      const options = (
        response.body as { options: { seconds: number; available: number }[] }
      ).options;
      const at = (seconds: number) =>
        options.find((one) => one.seconds === seconds)?.available;
      expect(at(10)).toBe(SHORT_QUESTIONS);
      expect(at(30)).toBe(SHORT_QUESTIONS);
      expect(at(45)).toBe(SHORT_QUESTIONS + 1);
    });
  });

  describe('connecting', () => {
    it('turns away a socket without a valid token', async () => {
      await expect(connect(undefined)).rejects.toThrow('UNAUTHORIZED');
      await expect(connect('not-a-token')).rejects.toThrow('UNAUTHORIZED');
    });

    it('turns away a demo account', async () => {
      const demo = await register();
      await prisma.user.update({
        where: { id: demo.userId },
        data: { isDemo: true },
      });
      await expect(connect(demo.token)).rejects.toThrow('DEMO');
    });

    it('turns away a teacher', async () => {
      const teacher = await register();
      await prisma.user.update({
        where: { id: teacher.userId },
        data: { role: UserRole.TEACHER },
      });
      await expect(connect(teacher.token)).rejects.toThrow('NOT_LEARNER');
    });
  });

  describe('a challenge by username', () => {
    it('plays a whole game: the server keeps the clock, the first answer stands, the result is written', async () => {
      const alice = await register();
      const bob = await register();
      const a = await connect(alice.token);
      const b = await connect(bob.token);
      await startByInvite(a, b, bob.username);

      let won = false;
      for (let index = 0; index < settings.count; index += 1) {
        const [aView, bView] = await Promise.all([
          game(a, (view) => view.phase === 'question' && view.index === index),
          game(b, (view) => view.phase === 'question' && view.index === index),
        ]);
        // Both are dealt the same question, and neither is given its key.
        expect(aView.question?.id).toBe(bView.question?.id);
        expect(JSON.stringify(aView.question)).not.toContain('isCorrect');

        if (index === 0) {
          // The ordinary quiz routes stay shut while the game is on.
          const duel = await prisma.duel.findUniqueOrThrow({
            where: { id: aView.duelId },
            select: { sessions: { select: { id: true, userId: true } } },
          });
          const aliceSession = duel.sessions.find(
            (one) => one.userId === alice.userId,
          )!;
          await request(app.getHttpServer())
            .get(`/api/v1/quiz/${aliceSession.id}`)
            .set('Authorization', `Bearer ${alice.token}`)
            .expect(409);
          await request(app.getHttpServer())
            .post(`/api/v1/duels/${aView.duelId}/play`)
            .set('Authorization', `Bearer ${alice.token}`)
            .expect(409);
        }

        const right = await option(aView, true);
        const wrong = await option(aView, false);
        const bobSees = game(b, (view) => view.opponent.answered);
        expect(
          await send(a, 'live:answer', {
            questionId: aView.question!.id,
            answer: { answerOptionId: right },
          }),
        ).toMatchObject({ ok: true, accepted: true });
        // Bob learns that Alice answered — not whether she was right.
        const seen = await bobSees;
        expect(seen.reveal).toBeNull();

        if (index === 0) {
          expect(
            await send(a, 'live:answer', {
              questionId: aView.question!.id,
              answer: { answerOptionId: wrong },
            }),
          ).toMatchObject({ accepted: false, reason: 'ALREADY_ANSWERED' });
        }

        const revealed = game(a, (view) => view.phase === 'reveal');
        await send(b, 'live:answer', {
          questionId: bView.question!.id,
          answer: { answerOptionId: wrong },
        });
        const reveal = (await revealed).reveal!;
        expect(reveal.correctAnswer).toEqual({ optionId: right });
        expect(reveal.mine?.isCorrect).toBe(true);
        expect(reveal.theirs?.isCorrect).toBe(false);
        won = true;
      }
      expect(won).toBe(true);

      const finished = await game(a, (view) => view.phase === 'finished');
      expect(finished.result).toMatchObject({ outcome: 'WIN', forfeit: null });
      expect(finished.me.score).toBe(settings.count);
      // Both times, and every question for both, so a result can be checked.
      expect(finished.result!.questions).toHaveLength(settings.count);
      expect(
        finished.result!.questions.every(
          (one) =>
            one.mine?.isCorrect === true && one.theirs?.isCorrect === false,
        ),
      ).toBe(true);
      expect(finished.result!.time.mine).toBeLessThanOrEqual(
        settings.count * settings.seconds,
      );

      const duel = await prisma.duel.findUniqueOrThrow({
        where: { id: finished.duelId },
        select: {
          mode: true,
          status: true,
          secondsPerQuestion: true,
          sessions: { select: { status: true, userId: true } },
        },
      });
      expect(duel).toMatchObject({
        mode: 'LIVE',
        status: 'COMPLETED',
        secondsPerQuestion: 10,
      });
      expect(duel.sessions.map((one) => one.status)).toEqual([
        'COMPLETED',
        'COMPLETED',
      ]);

      // The list tells the same story the game did.
      const listed = await request(app.getHttpServer())
        .get(`/api/v1/duels/${finished.duelId}`)
        .set('Authorization', `Bearer ${bob.token}`)
        .expect(200);
      expect(listed.body).toMatchObject({
        mode: 'LIVE',
        winner: 'CHALLENGER',
        secondsPerQuestion: 10,
      });
      // And the review is the ordinary one.
      await request(app.getHttpServer())
        .get(`/api/v1/quiz/${finished.result!.sessionId}/result`)
        .set('Authorization', `Bearer ${alice.token}`)
        .expect(200);
    });

    it('closes a question on the clock when nobody answers', async () => {
      const alice = await register();
      const bob = await register();
      const a = await connect(alice.token);
      const b = await connect(bob.token);
      await startByInvite(a, b, bob.username);

      const view = await game(a, (one) => one.phase === 'reveal');
      expect(view.index).toBe(0);
      expect(view.reveal?.mine).toBeNull();
      expect(view.reveal?.theirs).toBeNull();
    });

    it('refuses an unknown, offline or own username', async () => {
      const alice = await register();
      const bob = await register();
      const a = await connect(alice.token);

      const invite = (username: string) =>
        send(a, 'live:invite:send', { username, ...settings });
      expect((await invite('nobodyhere')).code).toBe('NOT_FOUND');
      expect((await invite(alice.username)).code).toBe('SELF');
      expect((await invite(bob.username)).code).toBe('OFFLINE');
    });

    it('answers a demo username as unknown', async () => {
      const alice = await register();
      const demo = await register();
      await prisma.user.update({
        where: { id: demo.userId },
        data: { isDemo: true },
      });
      const a = await connect(alice.token);
      const sent = await send(a, 'live:invite:send', {
        username: demo.username,
        ...settings,
      });
      expect(sent.code).toBe('NOT_FOUND');
    });

    it('tells both sides when a challenge is declined, or lapses', async () => {
      const alice = await register();
      const bob = await register();
      const a = await connect(alice.token);
      const b = await connect(bob.token);

      let incoming = next<{ inviteId: string }>(b, 'live:invite:incoming');
      await send(a, 'live:invite:send', {
        username: bob.username,
        ...settings,
      });
      const declined = next<{ reason: string }>(a, 'live:invite:closed');
      await send(b, 'live:invite:respond', {
        inviteId: (await incoming).inviteId,
        accept: false,
      });
      expect((await declined).reason).toBe('DECLINED');

      incoming = next<{ inviteId: string }>(b, 'live:invite:incoming');
      await send(a, 'live:invite:send', {
        username: bob.username,
        ...settings,
      });
      await incoming;
      const lapsed = await next<{ reason: string }>(a, 'live:invite:closed');
      expect(lapsed.reason).toBe('EXPIRED');
    });

    it('refuses a player with an unfinished test', async () => {
      const alice = await register();
      const bob = await register();
      await request(app.getHttpServer())
        .post('/api/v1/quiz/start')
        .set('Authorization', `Bearer ${alice.token}`)
        .send({ subjectId, questionCount: 5, timerEnabled: false })
        .expect(201);
      const a = await connect(alice.token);
      await connect(bob.token);

      const sent = await send(a, 'live:invite:send', {
        username: bob.username,
        ...settings,
      });
      expect(sent.code).toBe('ACTIVE_SESSION');
    });

    it('refuses settings a game does not allow', async () => {
      const alice = await register();
      const a = await connect(alice.token);
      for (const bad of [
        { ...settings, seconds: 12 },
        { ...settings, count: 7 },
        { ...settings, subjectId: 'x' },
      ]) {
        expect((await send(a, 'live:queue:join', bad)).code).toBe('INVALID');
      }
      // A topic is for a challenge, never for the queue.
      expect(
        (await send(a, 'live:queue:join', { ...settings, topicId })).code,
      ).toBe('INVALID');
      // More questions than fit the time.
      expect(
        (await send(a, 'live:queue:join', { ...settings, count: 20 })).code,
      ).toBe('NOT_ENOUGH_QUESTIONS');
    });
  });

  describe('a random opponent', () => {
    it('pairs two players waiting for the same game', async () => {
      const alice = await register();
      const bob = await register();
      const a = await connect(alice.token);
      const b = await connect(bob.token);

      const lobby = next<{ waiting: { players: number }[] }>(
        b,
        'live:lobby',
        (state) => state.waiting.length > 0,
      );
      expect(await send(a, 'live:queue:join', settings)).toMatchObject({
        ok: true,
        state: 'waiting',
      });
      // Bob can see someone is waiting — not who.
      expect((await lobby).waiting[0].players).toBe(1);

      const counting = game(a, (view) => view.phase === 'countdown');
      expect(await send(b, 'live:queue:join', settings)).toMatchObject({
        ok: true,
        state: 'matched',
      });
      const view = await counting;
      expect(view.opponent.id).toBe(bob.userId);
    });

    it('tells a player nobody came', async () => {
      const alice = await register();
      const a = await connect(alice.token);
      await send(a, 'live:queue:join', settings);
      const told = await next<{ state: string }>(
        a,
        'live:queue',
        (event) => event.state === 'timeout',
      );
      expect(told.state).toBe('timeout');
    });

    it('ends the game on a surrender, the other player winning', async () => {
      const alice = await register();
      const bob = await register();
      const a = await connect(alice.token);
      const b = await connect(bob.token);
      await send(a, 'live:queue:join', settings);
      await send(b, 'live:queue:join', settings);
      await game(b, (view) => view.phase === 'question');

      const ended = game(a, (view) => view.phase === 'finished');
      await send(b, 'live:forfeit');
      expect((await ended).result).toMatchObject({
        outcome: 'WIN',
        forfeit: 'OPPONENT',
      });
    });
  });

  describe('a dropped connection', () => {
    it('lets a player come back to the game in progress', async () => {
      const alice = await register();
      const bob = await register();
      const a = await connect(alice.token);
      const b = await connect(bob.token);
      await startByInvite(a, b, bob.username);
      await game(b, (view) => view.phase === 'question');

      const aliceSeesDrop = game(a, (view) => !view.opponent.connected);
      b.disconnect();
      await aliceSeesDrop;

      const again = io(`${baseUrl}/live`, {
        auth: { token: bob.token },
        transports: ['websocket'],
        forceNew: true,
        reconnection: false,
      });
      sockets.push(again);
      const resumed = await game(again, (view) => view.phase !== 'countdown');
      expect(resumed.opponent.id).toBe(alice.userId);
      await game(a, (view) => view.opponent.connected);
    });
  });
});
