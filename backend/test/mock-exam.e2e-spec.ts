import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  AccountStatus,
  Difficulty,
  QuestionFormat,
  QuestionType,
  QuizType,
  UserRole,
} from '@prisma/client';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { mockExamSpecFor } from './../src/quiz/mock-exam.config';
import type { NmtBlock, NmtPaper } from './../src/quiz/nmt/nmt-paper.types';
import {
  DEFAULT_NMT_BLOCKS,
  DEFAULT_NMT_PAPERS,
  NMT_BLOCKS,
  NMT_PAPERS,
} from './../src/quiz/nmt/nmt-papers';
import { listenOnLoopback } from './loopback';

interface SessionBody {
  sessionId: string;
  questionCount: number;
  timerEnabled: boolean;
  expiresAt: string | null;
}

interface AttemptBody {
  sessionId: string;
  subject: { id: string };
  correctAnswers: number;
  totalQuestions: number;
  accuracy: number;
  completedAt: string;
}

/**
 * Mock exam sittings (docs/00-overview/teacher-side-decisions.md decision 28).
 *
 * The point of a mock is that the conditions match the real thing, so the
 * tests here are about the conditions: a fixed paper nobody configures, one
 * clock for the whole paper rather than per question, and a history that can
 * be read as a curve.
 *
 * A subject with an NMT paper is sat and scored by it; the papers here are
 * small ones on subjects of the suite's own, so the engine is tested without
 * depending on seeded content (docs/02-domain/nmt-paper.md).
 */
describe('Mock exam (e2e)', () => {
  const PREFIX = 'mock-e2e';
  const PASSWORD = 'ValidPass1!';
  const START_URL = '/api/v1/quiz/mock-exam/start';
  const HISTORY_URL = '/api/v1/quiz/mock-exam/history';
  const SPEC_URL = '/api/v1/quiz/mock-exam/spec';

  const spec = mockExamSpecFor('anything');

  // A three-task paper on a subject of our own, so the paper engine is tested
  // without depending on seeded content: one point, three pairs, two points.
  // The matching fills rows 2–4 of the answer sheet, as English task 3 fills
  // 11–16, so the short answer that follows it is number 5 and not number 3.
  const PAPER_SLUG = `${PREFIX}-paper`;
  const GAP_SLUG = `${PREFIX}-gap`;
  const paperFor = (subjectSlug: string): NmtPaper => ({
    subjectSlug,
    title: 'Тестовий зошит',
    minutes: 25,
    timingNote: 'Тестова примітка.',
    tasks: [
      {
        number: 1,
        type: QuestionType.SINGLE_CHOICE,
        optionCount: 2,
        maxPoints: 1,
        scoring: 'whole',
      },
      {
        number: 2,
        type: QuestionType.MATCHING,
        optionCount: 8,
        covers: 3,
        maxPoints: 3,
        scoring: 'per-pair',
      },
      {
        number: 5,
        type: QuestionType.NUMERIC,
        optionCount: null,
        maxPoints: 2,
        scoring: 'whole',
      },
    ],
    sections: [
      { from: 1, to: 1, instruction: 'Оберіть одну відповідь.' },
      { from: 2, to: 4, instruction: 'Доберіть пари.' },
      { from: 5, to: 5, instruction: 'Запишіть число.' },
    ],
    passageBlocks: [],
    scale: {
      threshold: 2,
      table: { 2: 100, 3: 130, 4: 150, 5: 180, 6: 200 },
      source: 'Тестова таблиця',
    },
  });

  // Task 1 stands alone; 2 and 3 are asked about one text, as Ukrainian 21–25
  // are. Every task is a two-option single choice.
  const BLOCK_SLUG = `${PREFIX}-block`;
  const BLOCK_GAP_SLUG = `${PREFIX}-block-gap`;
  const blockPaperFor = (subjectSlug: string): NmtPaper => ({
    ...paperFor(subjectSlug),
    tasks: [1, 2, 3].map((number) => ({
      number,
      type: QuestionType.SINGLE_CHOICE,
      optionCount: 2,
      maxPoints: 1,
      scoring: 'whole' as const,
    })),
    sections: [
      { from: 1, to: 1, instruction: 'Оберіть одну відповідь.' },
      { from: 2, to: 3, instruction: 'Прочитайте текст.' },
    ],
    passageBlocks: [{ from: 2, to: 3 }],
    scale: {
      threshold: 1,
      table: { 1: 100, 2: 150, 3: 200 },
      source: 'Тестова таблиця',
    },
  });

  // A joint block of two of the papers above, and one whose second paper has a
  // task with nothing to fill it.
  const TEST_BLOCK: NmtBlock = {
    slug: `${PREFIX}-joint`,
    title: 'Тестовий блок',
    minutes: 40,
    timingNote: 'Спільний годинник.',
    subjectSlugs: [PAPER_SLUG, BLOCK_SLUG],
  };
  const GAP_BLOCK: NmtBlock = {
    slug: `${PREFIX}-joint-gap`,
    title: 'Блок із прогалиною',
    minutes: 40,
    timingNote: 'Спільний годинник.',
    subjectSlugs: [PAPER_SLUG, GAP_SLUG],
  };

  let app: INestApplication;
  let prisma: PrismaService;
  let subjectId: string;
  let thinSubjectId: string;
  let topicId: string;
  let thinTopicId: string;
  let counter = 0;
  let paperSubjectId: string;
  let paperTopicId: string;
  let gapSubjectId: string;
  let gapTopicId: string;
  let blockSubjectId: string;
  let blockTopicId: string;
  let blockGapSubjectId: string;
  let blockGapTopicId: string;

  const register = async (
    role: UserRole = UserRole.USER,
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

  const startMock = (token: string, subject = subjectId) =>
    request(app.getHttpServer())
      .post(START_URL)
      .set('Authorization', `Bearer ${token}`)
      .send({ subjectId: subject });

  const completeSession = async (
    token: string,
    sessionId: string,
  ): Promise<void> => {
    await request(app.getHttpServer())
      .post(`/api/v1/quiz/${sessionId}/complete`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  };

  const seedQuestions = async (
    topic: string,
    perTier: number,
  ): Promise<void> => {
    await prisma.question.deleteMany({ where: { topicId: topic } });
    const tiers = [
      Difficulty.BEGINNER,
      Difficulty.INTERMEDIATE,
      Difficulty.ADVANCED,
    ];
    for (const difficulty of tiers) {
      for (let index = 0; index < perTier; index += 1) {
        await prisma.question.create({
          data: {
            topicId: topic,
            type: QuestionType.SINGLE_CHOICE,
            title: `${difficulty} ${index}`,
            isPublished: true,
            difficulty,
            answerOptions: {
              create: [
                { content: 'Правильна', order: 0, isCorrect: true },
                { content: 'Хибна', order: 1, isCorrect: false },
              ],
            },
          },
        });
      }
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
      // A teacher's groups take their assignments with them; an assignment
      // would otherwise hold its author in place.
      await prisma.group.deleteMany({ where: { ownerId: { in: userIds } } });
    }
    await prisma.user.deleteMany({ where: { email: { startsWith: PREFIX } } });
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

  /** An NMT-format question for one task number of the test paper. */
  const seedTaskQuestion = async (
    topic: string,
    nmtTask: number,
  ): Promise<void> => {
    const base = {
      topicId: topic,
      isPublished: true,
      format: QuestionFormat.NMT,
      nmtTask,
      difficulty: Difficulty.INTERMEDIATE,
    };
    if (nmtTask === 1) {
      await prisma.question.create({
        data: {
          ...base,
          type: QuestionType.SINGLE_CHOICE,
          title: `task 1 ${counter++}`,
          answerOptions: {
            create: [
              { content: 'Правильна', order: 0, isCorrect: true },
              { content: 'Хибна', order: 1, isCorrect: false },
            ],
          },
        },
      });
    } else if (nmtTask === 2) {
      await prisma.question.create({
        data: {
          ...base,
          type: QuestionType.MATCHING,
          title: `task 2 ${counter++}`,
          configuration: {
            pairs: [
              { left: 0, right: 3 },
              { left: 1, right: 4 },
              { left: 2, right: 5 },
            ],
          },
          answerOptions: {
            create: ['p0', 'p1', 'p2', 'c3', 'c4', 'c5', 'c6', 'c7'].map(
              (content, order) => ({ content, order, isCorrect: false }),
            ),
          },
        },
      });
    } else {
      await prisma.question.create({
        data: {
          ...base,
          type: QuestionType.NUMERIC,
          title: `task 5 ${counter++}`,
          configuration: { answer: 7.5 },
        },
      });
    }
  };

  /**
   * A single choice for the block paper, with `optionTotal` options, standing
   * alone or at `passageOrder` in the text with this slug (created on first
   * use).
   */
  const seedBlockQuestion = async (
    topic: string,
    nmtTask: number,
    optionTotal: number,
    passage?: { slug: string; order: number },
  ): Promise<void> => {
    let passageId: string | null = null;
    if (passage) {
      const created = await prisma.passage.upsert({
        where: { topicId_slug: { topicId: topic, slug: passage.slug } },
        update: {},
        create: {
          topicId: topic,
          slug: passage.slug,
          content: `Текст «${passage.slug}».`,
        },
        select: { id: true },
      });
      passageId = created.id;
    }
    await prisma.question.create({
      data: {
        topicId: topic,
        isPublished: true,
        format: QuestionFormat.NMT,
        nmtTask,
        difficulty: Difficulty.INTERMEDIATE,
        type: QuestionType.SINGLE_CHOICE,
        title: `block ${nmtTask} ${counter++}`,
        passageId,
        passageOrder: passage?.order ?? null,
        answerOptions: {
          create: Array.from({ length: optionTotal }, (_, order) => ({
            content: `варіант ${order}`,
            order,
            isCorrect: order === 0,
          })),
        },
      },
    });
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(NMT_PAPERS)
      .useValue([
        ...DEFAULT_NMT_PAPERS,
        paperFor(PAPER_SLUG),
        paperFor(GAP_SLUG),
        blockPaperFor(BLOCK_SLUG),
        blockPaperFor(BLOCK_GAP_SLUG),
      ])
      .overrideProvider(NMT_BLOCKS)
      .useValue([...DEFAULT_NMT_BLOCKS, TEST_BLOCK, GAP_BLOCK])
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

    const full = await ensureSubject(`${PREFIX}-full`, 9940);
    subjectId = full.subjectId;
    topicId = full.topicId;

    const thin = await ensureSubject(`${PREFIX}-thin`, 9941);
    thinSubjectId = thin.subjectId;
    thinTopicId = thin.topicId;

    const paperSubject = await ensureSubject(PAPER_SLUG, 9943);
    paperSubjectId = paperSubject.subjectId;
    paperTopicId = paperSubject.topicId;
    const gapSubject = await ensureSubject(GAP_SLUG, 9944);
    gapSubjectId = gapSubject.subjectId;
    gapTopicId = gapSubject.topicId;

    const block = await ensureSubject(BLOCK_SLUG, 9945);
    blockSubjectId = block.subjectId;
    blockTopicId = block.topicId;
    const blockGap = await ensureSubject(BLOCK_GAP_SLUG, 9946);
    blockGapSubjectId = blockGap.subjectId;
    blockGapTopicId = blockGap.topicId;

    await removeFixtures();
    const paperTopics = [
      paperTopicId,
      gapTopicId,
      blockTopicId,
      blockGapTopicId,
    ];
    await prisma.question.deleteMany({
      where: { topicId: { in: paperTopics } },
    });
    await prisma.passage.deleteMany({
      where: { topicId: { in: paperTopics } },
    });
    for (const task of [1, 1, 2, 5]) {
      await seedTaskQuestion(paperTopicId, task);
    }
    // Task 2 is missing from this one on purpose.
    for (const task of [1, 5]) {
      await seedTaskQuestion(gapTopicId, task);
    }

    // One text covers 2–3; two more cover one number each, so a run stitched
    // from two texts would be possible if the draw allowed it. Task 1 has a
    // question in the paper's shape and one with an option too many.
    await seedBlockQuestion(blockTopicId, 1, 2);
    await seedBlockQuestion(blockTopicId, 1, 3);
    await seedBlockQuestion(blockTopicId, 2, 2, { slug: 'whole', order: 1 });
    await seedBlockQuestion(blockTopicId, 3, 2, { slug: 'whole', order: 2 });
    await seedBlockQuestion(blockTopicId, 2, 2, { slug: 'only-2', order: 1 });
    await seedBlockQuestion(blockTopicId, 3, 2, { slug: 'only-3', order: 1 });
    // Nothing here can be set: the wrong shape for 1, and no text covers 2–3.
    await seedBlockQuestion(blockGapTopicId, 1, 3);
    await seedBlockQuestion(blockGapTopicId, 2, 2, {
      slug: 'only-2',
      order: 1,
    });
    await seedBlockQuestion(blockGapTopicId, 3, 2, {
      slug: 'only-3',
      order: 1,
    });
    // Comfortably more than one paper needs, in every tier.
    await seedQuestions(topicId, spec.questionCount);
    // Nowhere near enough.
    await seedQuestions(thinTopicId, 2);
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
    const topicIds = [
      topicId,
      thinTopicId,
      paperTopicId,
      gapTopicId,
      blockTopicId,
      blockGapTopicId,
    ];
    await prisma.question.deleteMany({ where: { topicId: { in: topicIds } } });
    await prisma.passage.deleteMany({ where: { topicId: { in: topicIds } } });
    await prisma.topic.deleteMany({ where: { id: { in: topicIds } } });
    await prisma.subject.deleteMany({
      where: {
        id: {
          in: [
            subjectId,
            thinSubjectId,
            paperSubjectId,
            gapSubjectId,
            blockSubjectId,
            blockGapSubjectId,
          ],
        },
      },
    });
    await app.close();
  });

  describe('the sitting', () => {
    it('hands out a full paper on one clock', async () => {
      const learner = await register();

      const response = await startMock(learner.token).expect(201);

      const body = response.body as SessionBody;
      expect(body.questionCount).toBe(spec.questionCount);
      expect(body.timerEnabled).toBe(true);
      expect(body.expiresAt).not.toBeNull();

      // One clock for the whole paper, not sixty seconds a question — the
      // ordinary quiz timer would have given a very different deadline.
      const minutesGranted = Math.round(
        (new Date(body.expiresAt as string).getTime() - Date.now()) / 60000,
      );
      expect(minutesGranted).toBe(spec.minutes);
    });

    it('records the sitting as its own type', async () => {
      const learner = await register();

      const started = await startMock(learner.token).expect(201);

      const session = await prisma.quizSession.findUniqueOrThrow({
        where: { id: (started.body as SessionBody).sessionId },
        select: { mode: true, topicId: true },
      });
      expect(session.mode).toBe(QuizType.MOCK_EXAM);
      // A mock covers the subject, so it is never pinned to one topic.
      expect(session.topicId).toBeNull();
    });

    it('draws the weighting the specification asks for', async () => {
      const learner = await register();

      const started = await startMock(learner.token).expect(201);
      const rows = await prisma.quizSessionQuestion.findMany({
        where: { quizSessionId: (started.body as SessionBody).sessionId },
        select: { question: { select: { difficulty: true } } },
      });

      const counts = new Map<string, number>();
      for (const row of rows) {
        const tier = row.question.difficulty ?? 'NONE';
        counts.set(tier, (counts.get(tier) ?? 0) + 1);
      }

      for (const entry of spec.mix) {
        const expected = Math.floor(spec.questionCount * entry.share);
        expect(counts.get(entry.difficulty) ?? 0).toBeGreaterThanOrEqual(
          expected,
        );
      }
    });

    it('refuses a subject with too few questions rather than shortening the paper', async () => {
      const learner = await register();

      await startMock(learner.token, thinSubjectId).expect(409);
    });

    it('refuses an unpublished subject', async () => {
      const learner = await register();
      const hidden = await prisma.subject.create({
        data: {
          name: 'Hidden',
          slug: `${PREFIX}-hidden`,
          displayOrder: 9942,
          isPublished: false,
        },
        select: { id: true },
      });

      await startMock(learner.token, hidden.id).expect(404);

      await prisma.subject.delete({ where: { id: hidden.id } });
    });

    it('takes the self-study slot — one sitting at a time', async () => {
      const learner = await register();
      await startMock(learner.token).expect(201);

      await startMock(learner.token).expect(409);
    });

    it('blocks ordinary practice while a sitting is open', async () => {
      const learner = await register();
      await startMock(learner.token).expect(201);

      await request(app.getHttpServer())
        .post('/api/v1/quiz/start')
        .set('Authorization', `Bearer ${learner.token}`)
        .send({ subjectId, questionCount: 2, timerEnabled: false })
        .expect(409);
    });

    it('rejects anything beyond the subject in the body', async () => {
      const learner = await register();

      await request(app.getHttpServer())
        .post(START_URL)
        .set('Authorization', `Bearer ${learner.token}`)
        .send({ subjectId, questionCount: 5 })
        .expect(400);
    });

    it('requires a token', async () => {
      await request(app.getHttpServer())
        .post(START_URL)
        .send({ subjectId })
        .expect(401);
    });
  });

  describe('spec', () => {
    it('tells the client what the paper will be, so the UI need not repeat it', async () => {
      const learner = await register();

      const response = await request(app.getHttpServer())
        .get(SPEC_URL)
        .query({ subjectId })
        .set('Authorization', `Bearer ${learner.token}`)
        .expect(200);

      // The numbers must come from the same place the paper is drawn from.
      // A client hardcoding "30 questions, 60 minutes" would keep saying so
      // long after the official specification changes these.
      expect(response.body).toEqual({
        questionCount: spec.questionCount,
        minutes: spec.minutes,
        paper: null,
        block: null,
      });
    });

    it('keeps the difficulty mix to itself', async () => {
      const learner = await register();

      const response = await request(app.getHttpServer())
        .get(SPEC_URL)
        .query({ subjectId })
        .set('Authorization', `Bearer ${learner.token}`)
        .expect(200);

      // Publishing the weighting would invite gaming a paper whose whole
      // point is that it cannot be configured.
      expect(Object.keys(response.body as object).sort()).toEqual([
        'block',
        'minutes',
        'paper',
        'questionCount',
      ]);
    });

    it('refuses an unpublished subject', async () => {
      const learner = await register();
      await prisma.subject.update({
        where: { id: subjectId },
        data: { isPublished: false },
      });

      await request(app.getHttpServer())
        .get(SPEC_URL)
        .query({ subjectId })
        .set('Authorization', `Bearer ${learner.token}`)
        .expect(404);

      await prisma.subject.update({
        where: { id: subjectId },
        data: { isPublished: true },
      });
    });

    it('requires a subject', async () => {
      const learner = await register();

      await request(app.getHttpServer())
        .get(SPEC_URL)
        .set('Authorization', `Bearer ${learner.token}`)
        .expect(400);
    });

    it('requires a token', async () => {
      await request(app.getHttpServer())
        .get(SPEC_URL)
        .query({ subjectId })
        .expect(401);
    });
  });

  describe('history', () => {
    it('returns sittings oldest first, so the line reads left to right', async () => {
      const learner = await register();

      const first = await startMock(learner.token).expect(201);
      await completeSession(
        learner.token,
        (first.body as SessionBody).sessionId,
      );
      const second = await startMock(learner.token).expect(201);
      await completeSession(
        learner.token,
        (second.body as SessionBody).sessionId,
      );

      const response = await request(app.getHttpServer())
        .get(HISTORY_URL)
        .set('Authorization', `Bearer ${learner.token}`)
        .expect(200);

      const attempts = response.body as AttemptBody[];
      expect(attempts).toHaveLength(2);
      expect(attempts[0].sessionId).toBe((first.body as SessionBody).sessionId);
      expect(attempts[0].totalQuestions).toBe(spec.questionCount);
    });

    it('leaves ordinary practice out of it', async () => {
      const learner = await register();

      const practice = await request(app.getHttpServer())
        .post('/api/v1/quiz/start')
        .set('Authorization', `Bearer ${learner.token}`)
        .send({ subjectId, questionCount: 2, timerEnabled: false })
        .expect(201);
      await completeSession(
        learner.token,
        (practice.body as SessionBody).sessionId,
      );

      const response = await request(app.getHttpServer())
        .get(HISTORY_URL)
        .set('Authorization', `Bearer ${learner.token}`)
        .expect(200);

      expect(response.body as AttemptBody[]).toHaveLength(0);
    });

    it('shows one learner nothing of another', async () => {
      const first = await register();
      const second = await register();
      const started = await startMock(first.token).expect(201);
      await completeSession(
        first.token,
        (started.body as SessionBody).sessionId,
      );

      const response = await request(app.getHttpServer())
        .get(HISTORY_URL)
        .set('Authorization', `Bearer ${second.token}`)
        .expect(200);

      expect(response.body as AttemptBody[]).toHaveLength(0);
    });

    it('gives a provisional sitting no converted score', async () => {
      const learner = await register();
      const started = await startMock(learner.token).expect(201);
      await completeSession(
        learner.token,
        (started.body as SessionBody).sessionId,
      );

      const response = await request(app.getHttpServer())
        .get(HISTORY_URL)
        .set('Authorization', `Bearer ${learner.token}`)
        .expect(200);

      // A subject still on the provisional sitting has no paper, so there is
      // no official table to convert with — and nothing is guessed in its place.
      for (const attempt of response.body as AttemptBody[]) {
        expect(attempt).toMatchObject({
          blockTitle: null,
          testPoints: null,
          maxTestPoints: null,
          scaledScore: null,
        });
      }
    });
  });

  describe('a sitting of an NMT paper', () => {
    interface ResumeBody {
      sitting?: {
        title: string;
        papers: {
          subjectName: string;
          title: string;
          maxTestPoints: number;
          sections: { from: number; to: number; instruction: string }[];
          start: number;
          count: number;
        }[];
        taskNumbers: (number | null)[];
        taskLabels: (string | null)[];
      };
      questions: { id: string; type: string }[];
    }

    interface ReviewBody {
      nmt?: {
        title: string;
        papers: {
          subjectName: string;
          testPoints: number;
          maxTestPoints: number;
          scaledScore: number | null;
          threshold: number;
          tasks: {
            number: number;
            label: string;
            points: number;
            maxPoints: number;
          }[];
        }[];
      };
    }

    const answer = (
      token: string,
      sessionId: string,
      questionId: string,
      selectedAnswer: Record<string, unknown>,
    ) =>
      request(app.getHttpServer())
        .post(`/api/v1/quiz/${sessionId}/answers`)
        .set('Authorization', `Bearer ${token}`)
        .send({ questionId, selectedAnswer })
        .expect(200);

    it('describes the paper in the spec: tasks, points, clock and instructions', async () => {
      const learner = await register();

      const response = await request(app.getHttpServer())
        .get(SPEC_URL)
        .query({ subjectId: paperSubjectId })
        .set('Authorization', `Bearer ${learner.token}`)
        .expect(200);

      expect(response.body).toEqual({
        questionCount: 3,
        minutes: 25,
        paper: {
          title: 'Тестовий зошит',
          // Three questions, but the matching fills rows 2–4: five tasks.
          taskCount: 5,
          maxTestPoints: 6,
          timingNote: 'Тестова примітка.',
          sections: paperFor(PAPER_SLUG).sections,
        },
        block: null,
      });
    });

    it('sets one question for every task, in the order of the paper, on its clock', async () => {
      const learner = await register();

      const started = await startMock(learner.token, paperSubjectId).expect(
        201,
      );
      const body = started.body as SessionBody;
      expect(body.questionCount).toBe(3);
      const minutes = Math.round(
        (new Date(body.expiresAt as string).getTime() - Date.now()) / 60000,
      );
      expect(minutes).toBe(25);

      const resumed = await request(app.getHttpServer())
        .get(`/api/v1/quiz/${body.sessionId}`)
        .set('Authorization', `Bearer ${learner.token}`)
        .expect(200);
      const resume = resumed.body as ResumeBody;

      expect(resume.sitting?.taskNumbers).toEqual([1, 2, 5]);
      // The matching carries rows 2–4, so that is what the paper prints.
      expect(resume.sitting?.taskLabels).toEqual(['1', '2–4', '5']);
      expect(resume.sitting?.papers).toEqual([
        expect.objectContaining({
          subjectName: PAPER_SLUG,
          start: 0,
          count: 3,
        }),
      ]);
      expect(resume.sitting?.papers[0].sections).toHaveLength(3);
      expect(resume.questions.map((question) => question.type)).toEqual([
        'SINGLE_CHOICE',
        'MATCHING',
        'NUMERIC',
      ]);
    });

    it('refuses a sitting with a task missing, and names it', async () => {
      const learner = await register();

      const response = await startMock(learner.token, gapSubjectId).expect(409);

      expect((response.body as { message: string }).message).toContain('№2');
    });

    it('scores the paper the way the exam does: a point a pair, two for a short answer', async () => {
      const learner = await register();
      const started = await startMock(learner.token, paperSubjectId).expect(
        201,
      );
      const sessionId = (started.body as SessionBody).sessionId;
      const rows = await prisma.quizSessionQuestion.findMany({
        where: { quizSessionId: sessionId },
        orderBy: { position: 'asc' },
        select: {
          question: {
            select: {
              id: true,
              answerOptions: {
                select: { id: true, order: true, isCorrect: true },
              },
            },
          },
        },
      });
      const [single, matching, numeric] = rows.map((row) => row.question);
      const byOrder = new Map(
        matching.answerOptions.map((option) => [option.order, option.id]),
      );

      await answer(learner.token, sessionId, single.id, {
        answerOptionId: single.answerOptions.find((option) => option.isCorrect)
          ?.id,
      });
      // Two of the three pairs right.
      await answer(learner.token, sessionId, matching.id, {
        pairs: [
          { left: byOrder.get(0), right: byOrder.get(3) },
          { left: byOrder.get(1), right: byOrder.get(4) },
          { left: byOrder.get(2), right: byOrder.get(6) },
        ],
      });
      await answer(learner.token, sessionId, numeric.id, {
        numericAnswer: '8',
      });
      await completeSession(learner.token, sessionId);

      const review = await request(app.getHttpServer())
        .get(`/api/v1/quiz/${sessionId}/result`)
        .set('Authorization', `Bearer ${learner.token}`)
        .expect(200);
      const nmt = (review.body as ReviewBody).nmt?.papers[0];

      expect(
        nmt?.tasks.map((task) => [task.number, task.points, task.maxPoints]),
      ).toEqual([
        [1, 1, 1],
        [2, 2, 3],
        [5, 0, 2],
      ]);
      // The matching fills rows 2–4, so the review prints its run, not «2».
      expect(nmt?.tasks.map((task) => task.label)).toEqual(['1', '2–4', '5']);
      expect(nmt).toMatchObject({
        testPoints: 3,
        maxTestPoints: 6,
        scaledScore: 130,
      });

      const stored = await prisma.resultPaperScore.findMany({
        where: { result: { quizSessionId: sessionId } },
        select: {
          subjectId: true,
          testPoints: true,
          maxTestPoints: true,
          scaledScore: true,
        },
      });
      expect(stored).toEqual([
        {
          subjectId: paperSubjectId,
          testPoints: 3,
          maxTestPoints: 6,
          scaledScore: 130,
        },
      ]);

      const history = await request(app.getHttpServer())
        .get(HISTORY_URL)
        .query({ subjectId: paperSubjectId })
        .set('Authorization', `Bearer ${learner.token}`)
        .expect(200);
      expect(history.body as AttemptBody[]).toEqual([
        expect.objectContaining({
          blockTitle: null,
          testPoints: 3,
          maxTestPoints: 6,
          scaledScore: 130,
        }),
      ]);
    });

    it('has no 100–200 score below the threshold', async () => {
      const learner = await register();
      const started = await startMock(learner.token, paperSubjectId).expect(
        201,
      );
      const sessionId = (started.body as SessionBody).sessionId;
      await completeSession(learner.token, sessionId);

      const review = await request(app.getHttpServer())
        .get(`/api/v1/quiz/${sessionId}/result`)
        .set('Authorization', `Bearer ${learner.token}`)
        .expect(200);

      expect((review.body as ReviewBody).nmt?.papers[0]).toMatchObject({
        testPoints: 0,
        scaledScore: null,
        threshold: 2,
      });
    });

    describe('in a joint block', () => {
      const BLOCKS_URL = '/api/v1/quiz/mock-exam/blocks';

      const startBlock = (token: string, body: Record<string, unknown>) =>
        request(app.getHttpServer())
          .post(START_URL)
          .set('Authorization', `Bearer ${token}`)
          .send(body);

      it('is listed with its subjects, for the client to offer beside them', async () => {
        const learner = await register();

        const response = await request(app.getHttpServer())
          .get(BLOCKS_URL)
          .set('Authorization', `Bearer ${learner.token}`)
          .expect(200);

        expect(response.body).toEqual(
          expect.arrayContaining([
            {
              slug: TEST_BLOCK.slug,
              title: TEST_BLOCK.title,
              subjectNames: [PAPER_SLUG, BLOCK_SLUG],
            },
          ]),
        );
      });

      it('describes every paper and the shared clock in the spec', async () => {
        const learner = await register();

        const response = await request(app.getHttpServer())
          .get(SPEC_URL)
          .query({ block: TEST_BLOCK.slug })
          .set('Authorization', `Bearer ${learner.token}`)
          .expect(200);

        expect(response.body).toEqual({
          questionCount: 6,
          minutes: 40,
          paper: null,
          block: {
            title: TEST_BLOCK.title,
            timingNote: TEST_BLOCK.timingNote,
            papers: [
              {
                subjectName: PAPER_SLUG,
                title: 'Тестовий зошит',
                questionCount: 3,
                taskCount: 5,
                maxTestPoints: 6,
              },
              {
                subjectName: BLOCK_SLUG,
                title: 'Тестовий зошит',
                questionCount: 3,
                taskCount: 3,
                maxTestPoints: 3,
              },
            ],
          },
        });
      });

      it('sets the papers one after another on one clock, each numbered from 1', async () => {
        const learner = await register();

        const started = await startBlock(learner.token, {
          block: TEST_BLOCK.slug,
        }).expect(201);
        const body = started.body as SessionBody;
        expect(body.questionCount).toBe(6);
        expect(
          Math.round(
            (new Date(body.expiresAt as string).getTime() - Date.now()) / 60000,
          ),
        ).toBe(40);

        const resumed = await request(app.getHttpServer())
          .get(`/api/v1/quiz/${body.sessionId}`)
          .set('Authorization', `Bearer ${learner.token}`)
          .expect(200);
        const resume = resumed.body as ResumeBody;

        expect(resume.sitting?.title).toBe(TEST_BLOCK.title);
        expect(resume.sitting?.taskNumbers).toEqual([1, 2, 5, 1, 2, 3]);
        expect(resume.sitting?.taskLabels).toEqual([
          '1',
          '2–4',
          '5',
          '1',
          '2',
          '3',
        ]);
        expect(
          resume.sitting?.papers.map((paper) => [
            paper.subjectName,
            paper.start,
            paper.count,
          ]),
        ).toEqual([
          [PAPER_SLUG, 0, 3],
          [BLOCK_SLUG, 3, 3],
        ]);
      });

      it('refuses a block with a task missing in any paper, naming the subject and the number', async () => {
        const learner = await register();

        const response = await startBlock(learner.token, {
          block: GAP_BLOCK.slug,
        }).expect(409);

        expect((response.body as { message: string }).message).toContain(
          `${GAP_SLUG}: №2`,
        );
      });

      it('takes a subject or a block, never both, and only a block that exists', async () => {
        const learner = await register();

        await startBlock(learner.token, {
          subjectId: paperSubjectId,
          block: TEST_BLOCK.slug,
        }).expect(400);
        await startBlock(learner.token, { block: 'no-such-block' }).expect(404);
      });

      it('scores each paper on its own and shows the sitting in the history of both subjects', async () => {
        const learner = await register();
        const started = await startBlock(learner.token, {
          block: TEST_BLOCK.slug,
        }).expect(201);
        const sessionId = (started.body as SessionBody).sessionId;
        const rows = await prisma.quizSessionQuestion.findMany({
          where: { quizSessionId: sessionId },
          orderBy: { position: 'asc' },
          select: {
            question: {
              select: {
                id: true,
                answerOptions: { select: { id: true, isCorrect: true } },
              },
            },
          },
        });
        // Task 1 of each paper right, nothing else answered.
        for (const position of [0, 3]) {
          const { question } = rows[position];
          await answer(learner.token, sessionId, question.id, {
            answerOptionId: question.answerOptions.find(
              (option) => option.isCorrect,
            )?.id,
          });
        }
        await completeSession(learner.token, sessionId);

        const review = await request(app.getHttpServer())
          .get(`/api/v1/quiz/${sessionId}/result`)
          .set('Authorization', `Bearer ${learner.token}`)
          .expect(200);
        const nmt = (review.body as ReviewBody).nmt;

        // The first paper's threshold is 2, the second's is 1.
        expect(nmt?.title).toBe(TEST_BLOCK.title);
        expect(
          nmt?.papers.map((paper) => [
            paper.subjectName,
            paper.testPoints,
            paper.scaledScore,
          ]),
        ).toEqual([
          [PAPER_SLUG, 1, null],
          [BLOCK_SLUG, 1, 100],
        ]);

        // Unfiltered, the sitting is one row per paper, in the block's order.
        const all = await request(app.getHttpServer())
          .get(HISTORY_URL)
          .set('Authorization', `Bearer ${learner.token}`)
          .expect(200);
        expect(
          (all.body as AttemptBody[])
            .filter((attempt) => attempt.sessionId === sessionId)
            .map((attempt) => attempt.subject.id),
        ).toEqual([paperSubjectId, blockSubjectId]);

        const expected = [
          [paperSubjectId, null],
          [blockSubjectId, 100],
        ] as const;
        for (const [subject, score] of expected) {
          const history = await request(app.getHttpServer())
            .get(HISTORY_URL)
            .query({ subjectId: subject })
            .set('Authorization', `Bearer ${learner.token}`)
            .expect(200);
          expect(history.body as AttemptBody[]).toEqual([
            expect.objectContaining({
              sessionId,
              blockTitle: TEST_BLOCK.title,
              subject: expect.objectContaining({ id: subject }) as unknown,
              testPoints: 1,
              scaledScore: score,
            }),
          ]);
        }
      });
    });
  });

  describe('a run of tasks on one text', () => {
    const sessionTasks = async (sessionId: string) =>
      prisma.quizSessionQuestion.findMany({
        where: { quizSessionId: sessionId },
        orderBy: { position: 'asc' },
        select: {
          question: {
            select: {
              nmtTask: true,
              passage: { select: { slug: true } },
              _count: { select: { answerOptions: true } },
            },
          },
        },
      });

    it('takes the whole run from one text, in the paper’s order', async () => {
      const learner = await register();

      const started = await startMock(learner.token, blockSubjectId).expect(
        201,
      );
      const rows = await sessionTasks((started.body as SessionBody).sessionId);

      expect(rows.map((row) => row.question.nmtTask)).toEqual([1, 2, 3]);
      expect(rows.slice(1).map((row) => row.question.passage?.slug)).toEqual([
        'whole',
        'whole',
      ]);
    });

    it('never sets a question in a shape the paper does not print there', async () => {
      // Task 1 has a two-option question and a three-option one; only the
      // first fits, so every sitting must take it.
      for (let sitting = 0; sitting < 4; sitting += 1) {
        const learner = await register();
        const started = await startMock(learner.token, blockSubjectId).expect(
          201,
        );
        const rows = await sessionTasks(
          (started.body as SessionBody).sessionId,
        );
        expect(rows[0].question._count.answerOptions).toBe(2);
      }
    });

    it('refuses a run no single text covers, and a number with nothing in its shape', async () => {
      const learner = await register();

      const response = await startMock(learner.token, blockGapSubjectId).expect(
        409,
      );

      expect((response.body as { message: string }).message).toContain(
        '№1, 2, 3',
      );
    });
  });
  /** Answers the first single-choice question of a session correctly. */
  const answerOneCorrectly = async (
    token: string,
    sessionId: string,
  ): Promise<void> => {
    const resumed = await request(app.getHttpServer())
      .get(`/api/v1/quiz/${sessionId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const first = (
      resumed.body as { questions: { id: string; type: string }[] }
    ).questions.find((question) => question.type === 'SINGLE_CHOICE');
    const right = await prisma.answerOption.findFirstOrThrow({
      where: { questionId: first?.id, isCorrect: true },
      select: { id: true },
    });
    await request(app.getHttpServer())
      .post(`/api/v1/quiz/${sessionId}/answers`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        questionId: first?.id,
        selectedAnswer: { answerOptionId: right.id },
      })
      .expect(200);
  };

  describe('a teacher sitting a paper (decision 29)', () => {
    it('reads the score but earns no XP, unlike a learner on the same paper', async () => {
      const teacher = await register(UserRole.TEACHER);
      const learner = await register();

      for (const sitter of [teacher, learner]) {
        const started = await startMock(sitter.token, paperSubjectId).expect(
          201,
        );
        const sessionId = (started.body as SessionBody).sessionId;
        await answerOneCorrectly(sitter.token, sessionId);
        await completeSession(sitter.token, sessionId);

        const review = await request(app.getHttpServer())
          .get(`/api/v1/quiz/${sessionId}/result`)
          .set('Authorization', `Bearer ${sitter.token}`)
          .expect(200);
        const body = review.body as {
          result: { xpEarned: number };
          nmt?: { papers: { testPoints: number }[] };
        };
        expect(body.nmt?.papers[0].testPoints).toBe(1);

        const transactions = await prisma.xPTransaction.count({
          where: { userId: sitter.userId },
        });
        if (sitter === teacher) {
          expect(body.result.xpEarned).toBe(0);
          expect(transactions).toBe(0);
        } else {
          expect(transactions).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('a paper set as homework (decision 29)', () => {
    const inAWeek = (): string =>
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    /** A teacher's group in one subject, with these students in it. */
    const groupWith = async (
      teacherToken: string,
      subject: string,
      students: { token: string }[],
    ): Promise<string> => {
      const created = await request(app.getHttpServer())
        .post('/api/v1/teacher/groups')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({ name: 'Група', subjectId: subject })
        .expect(201);
      const group = created.body as { id: string; inviteCode: string };
      for (const student of students) {
        await request(app.getHttpServer())
          .post('/api/v1/groups/join')
          .set('Authorization', `Bearer ${student.token}`)
          .send({ inviteCode: group.inviteCode })
          .expect(200);
      }
      return group.id;
    };

    const issueMock = (teacherToken: string, groupId: string) =>
      request(app.getHttpServer())
        .post(`/api/v1/teacher/groups/${groupId}/assignments`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({ title: 'Пробний', dueAt: inAWeek(), mode: 'MOCK_EXAM' });

    const startAssignment = async (
      token: string,
      assignmentId: string,
    ): Promise<SessionBody> =>
      (
        await request(app.getHttpServer())
          .post(`/api/v1/assignments/${assignmentId}/start`)
          .set('Authorization', `Bearer ${token}`)
          .expect(200)
      ).body as SessionBody;

    const resume = async (token: string, sessionId: string) =>
      (
        await request(app.getHttpServer())
          .get(`/api/v1/quiz/${sessionId}`)
          .set('Authorization', `Bearer ${token}`)
          .expect(200)
      ).body as {
        questions: { id: string }[];
        sitting?: { taskLabels: (string | null)[] };
      };

    it('sets one variant for the whole group, on the paper clock, scored on the scale', async () => {
      const teacher = await register(UserRole.TEACHER);
      const first = await register();
      const second = await register();
      const groupId = await groupWith(teacher.token, paperSubjectId, [
        first,
        second,
      ]);

      const issued = await issueMock(teacher.token, groupId).expect(201);
      const assignment = issued.body as {
        id: string;
        questionCount: number;
        mockExam: unknown;
      };
      expect(assignment.questionCount).toBe(3);
      expect(assignment.mockExam).toEqual({
        title: 'Тестовий зошит',
        taskCount: 5,
        maxTestPoints: 6,
        minutes: 25,
      });

      const firstSession = await startAssignment(first.token, assignment.id);
      const secondSession = await startAssignment(second.token, assignment.id);
      expect(firstSession.timerEnabled).toBe(true);
      const minutes = Math.round(
        (new Date(firstSession.expiresAt as string).getTime() - Date.now()) /
          60000,
      );
      expect(minutes).toBe(25);

      const firstPaper = await resume(first.token, firstSession.sessionId);
      const secondPaper = await resume(second.token, secondSession.sessionId);
      // Task 1 has two questions in the pool; the variant is fixed at issue.
      expect(secondPaper.questions.map((question) => question.id)).toEqual(
        firstPaper.questions.map((question) => question.id),
      );
      expect(firstPaper.sitting?.taskLabels).toEqual(['1', '2–4', '5']);

      await answerOneCorrectly(first.token, firstSession.sessionId);
      await completeSession(first.token, firstSession.sessionId);

      const submissions = await request(app.getHttpServer())
        .get(`/api/v1/teacher/assignments/${assignment.id}/submissions`)
        .set('Authorization', `Bearer ${teacher.token}`)
        .expect(200);
      const rows = submissions.body as {
        student: { id: string };
        status: string;
        score: {
          testPoints: number | null;
          maxTestPoints: number | null;
          scaledScore: number | null;
        } | null;
      }[];
      const firstRow = rows.find((row) => row.student.id === first.userId);
      const secondRow = rows.find((row) => row.student.id === second.userId);
      // One point against a threshold of two: points, and no 100–200 score.
      expect(firstRow?.score).toMatchObject({
        testPoints: 1,
        maxTestPoints: 6,
        scaledScore: null,
      });
      expect(secondRow?.status).toBe('IN_PROGRESS');
    });

    it('refuses a subject that has no paper', async () => {
      const teacher = await register(UserRole.TEACHER);
      const student = await register();
      const groupId = await groupWith(teacher.token, subjectId, [student]);

      await issueMock(teacher.token, groupId).expect(400);
    });
  });
});
