import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  AccountStatus,
  Language,
  QuestionType,
  UserRole,
} from '@prisma/client';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

interface OptionBody {
  id: string;
  content: string;
  imageUrl: string | null;
  isCorrect: boolean;
  order: number;
}

interface QuestionBody {
  id: string;
  type: string;
  title: string;
  configuration: { pairs: { left: number; right: number }[] } | null;
  answerOptions: OptionBody[];
}

/**
 * Answer Option management end-to-end tests — Phase 4.4
 * (docs/04-api/admin.md §6-7, docs/02-domain/answer-option.md §9-12).
 *
 * Options stay owned by their parent Question; this suite exercises the
 * refined ordering, matching-validation, translation-lifecycle, and
 * atomicity guarantees.
 */
describe('Admin Answer Options (e2e)', () => {
  const EMAIL_PREFIX = 'phase44-ao';
  const USERNAME_PREFIX = 'phase44ao';
  const SLUG_PREFIX = 'p44';
  const PASSWORD = 'ValidPass1!';
  const QUESTIONS_URL = '/api/v1/admin/questions';

  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let topicId: string;
  let counter = 0;

  const registerAdmin = async (): Promise<string> => {
    counter += 1;
    const email = `${EMAIL_PREFIX}-${counter}@example.com`;
    const username = `${USERNAME_PREFIX}${counter}`;

    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, username, password: PASSWORD })
      .expect(201);
    await prisma.user.update({
      where: { email },
      data: { accountStatus: AccountStatus.ACTIVE, role: UserRole.ADMIN },
    });

    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: PASSWORD })
      .expect(200);
    return (response.body as { accessToken: string }).accessToken;
  };

  const createFixtures = async (): Promise<string> => {
    const subject = await request(app.getHttpServer())
      .post('/api/v1/admin/subjects')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Phase44 Subject', slug: `${SLUG_PREFIX}-subject` })
      .expect(201);
    const topic = await request(app.getHttpServer())
      .post('/api/v1/admin/topics')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        subjectId: (subject.body as { id: string }).id,
        name: 'Phase44 Topic',
        slug: `${SLUG_PREFIX}-topic`,
      })
      .expect(201);
    return (topic.body as { id: string }).id;
  };

  const createQuestion = async (
    payload: Record<string, unknown>,
    expectedStatus = 201,
  ): Promise<QuestionBody> => {
    const response = await request(app.getHttpServer())
      .post(QUESTIONS_URL)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(payload)
      .expect(expectedStatus);
    return response.body as QuestionBody;
  };

  const updateQuestion = async (
    id: string,
    payload: Record<string, unknown>,
    expectedStatus = 200,
  ): Promise<QuestionBody> => {
    const response = await request(app.getHttpServer())
      .put(`${QUESTIONS_URL}/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(payload)
      .expect(expectedStatus);
    return response.body as QuestionBody;
  };

  const fetchQuestion = async (id: string): Promise<QuestionBody> => {
    const response = await request(app.getHttpServer())
      .get(`${QUESTIONS_URL}?pageSize=100&topicId=${topicId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const found = (response.body as { items: QuestionBody[] }).items.find(
      (q) => q.id === id,
    );
    expect(found).toBeDefined();
    return found as QuestionBody;
  };

  const singleChoice = (
    overrides: Record<string, unknown> = {},
  ): Record<string, unknown> => {
    counter += 1;
    return {
      topicId,
      type: QuestionType.SINGLE_CHOICE,
      title: `Phase44 single ${counter}?`,
      options: [
        { content: 'Correct', isCorrect: true },
        { content: 'Wrong A' },
        { content: 'Wrong B' },
      ],
      ...overrides,
    };
  };

  const matching = (
    overrides: Record<string, unknown> = {},
  ): Record<string, unknown> => {
    counter += 1;
    return {
      topicId,
      type: QuestionType.MATCHING,
      title: `Phase44 matching ${counter}?`,
      options: [
        { content: 'L1' },
        { content: 'R1' },
        { content: 'L2' },
        { content: 'R2' },
      ],
      configuration: {
        pairs: [
          { left: 0, right: 1 },
          { left: 2, right: 3 },
        ],
      },
      ...overrides,
    };
  };

  const removeTestData = async (): Promise<void> => {
    await prisma.question.deleteMany({
      where: { topic: { slug: { startsWith: SLUG_PREFIX } } },
    });
    await prisma.topic.deleteMany({
      where: { slug: { startsWith: SLUG_PREFIX } },
    });
    await prisma.subject.deleteMany({
      where: { slug: { startsWith: SLUG_PREFIX } },
    });
    await prisma.user.deleteMany({
      where: { email: { startsWith: EMAIL_PREFIX } },
    });
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
    await removeTestData();

    adminToken = await registerAdmin();
    topicId = await createFixtures();
  });

  afterAll(async () => {
    await removeTestData();
    await app.close();
  });

  describe('ordering normalization', () => {
    it('normalizes sparse explicit orders to 0..n-1 at creation', async () => {
      const body = await createQuestion(
        singleChoice({
          options: [
            { content: 'Third', order: 50 },
            { content: 'First', isCorrect: true, order: 2 },
            { content: 'Second', order: 7 },
          ],
        }),
      );

      expect(body.answerOptions.map((o) => [o.order, o.content])).toEqual([
        [0, 'First'],
        [1, 'Second'],
        [2, 'Third'],
      ]);
    });

    it('reorders by array position on merge updates and stays contiguous', async () => {
      const created = await createQuestion(singleChoice());
      const [a, b, c] = created.answerOptions;

      const body = await updateQuestion(created.id, {
        options: [{ id: c.id }, { id: a.id }, { id: b.id }],
      });

      expect(body.answerOptions.map((o) => [o.order, o.id])).toEqual([
        [0, c.id],
        [1, a.id],
        [2, b.id],
      ]);
    });

    it('renormalizes after deleting an option from the middle', async () => {
      const created = await createQuestion(singleChoice());
      const [a, , c] = created.answerOptions;

      const body = await updateQuestion(created.id, {
        options: [{ id: a.id }, { id: c.id }],
      });

      expect(body.answerOptions.map((o) => o.order)).toEqual([0, 1]);
    });

    it('remaps a MATCHING configuration when explicit orders are normalized', async () => {
      const body = await createQuestion(
        matching({
          options: [
            { content: 'L1', order: 10 },
            { content: 'R1', order: 5 },
            { content: 'L2', order: 30 },
            { content: 'R2', order: 20 },
          ],
          configuration: {
            pairs: [
              { left: 10, right: 5 },
              { left: 30, right: 20 },
            ],
          },
        }),
      );

      // Sorted by supplied order: R1(5)→0, L1(10)→1, R2(20)→2, L2(30)→3.
      expect(body.answerOptions.map((o) => [o.order, o.content])).toEqual([
        [0, 'R1'],
        [1, 'L1'],
        [2, 'R2'],
        [3, 'L2'],
      ]);
      expect(body.configuration).toEqual({
        pairs: [
          { left: 1, right: 0 },
          { left: 3, right: 2 },
        ],
      });
    });

    it('lets stored MATCHING pairs follow their options through a reorder', async () => {
      const created = await createQuestion(matching());
      const [l1, r1, l2, r2] = created.answerOptions;

      // Reverse the array without supplying a configuration.
      const body = await updateQuestion(created.id, {
        options: [{ id: r2.id }, { id: l2.id }, { id: r1.id }, { id: l1.id }],
      });

      // New orders: r2→0, l2→1, r1→2, l1→3. Stored pairs (l1,r1),(l2,r2)
      // must still connect the same options.
      expect(body.configuration).toEqual({
        pairs: [
          { left: 3, right: 2 },
          { left: 1, right: 0 },
        ],
      });
    });
  });

  describe('imageUrl on options', () => {
    it('stores, keeps, and clears option images', async () => {
      const created = await createQuestion(
        singleChoice({
          options: [
            {
              content: 'Correct',
              isCorrect: true,
              imageUrl: 'https://example.com/a.png',
            },
            { content: 'Wrong' },
          ],
        }),
      );
      const [withImage, without] = created.answerOptions;
      expect(withImage.imageUrl).toBe('https://example.com/a.png');
      expect(without.imageUrl).toBeNull();

      // Untouched on merge when omitted.
      const kept = await updateQuestion(created.id, {
        options: [
          { id: withImage.id, content: 'Correct v2' },
          { id: without.id },
        ],
      });
      expect(kept.answerOptions[0].imageUrl).toBe('https://example.com/a.png');

      // Cleared with explicit null.
      const cleared = await updateQuestion(created.id, {
        options: [{ id: withImage.id, imageUrl: null }, { id: without.id }],
      });
      expect(cleared.answerOptions[0].imageUrl).toBeNull();
    });

    it('rejects an option imageUrl longer than 500 characters', async () => {
      await createQuestion(
        singleChoice({
          options: [
            {
              content: 'Correct',
              isCorrect: true,
              imageUrl: `https://example.com/${'a'.repeat(500)}`,
            },
            { content: 'Wrong' },
          ],
        }),
        400,
      );
    });
  });

  describe('matching validation edge cases', () => {
    it.each([
      [
        'a single pair',
        {
          options: [{ content: 'L' }, { content: 'R' }],
          configuration: { pairs: [{ left: 0, right: 1 }] },
        },
      ],
      [
        'a self pair',
        {
          configuration: {
            pairs: [
              { left: 0, right: 0 },
              { left: 2, right: 3 },
            ],
          },
        },
      ],
      [
        'a duplicate pair',
        {
          options: [
            { content: 'L1' },
            { content: 'R1' },
            { content: 'L2' },
            { content: 'R2' },
            { content: 'L3' },
            { content: 'R3' },
          ],
          configuration: {
            pairs: [
              { left: 0, right: 1 },
              { left: 0, right: 1 },
              { left: 4, right: 5 },
            ],
          },
        },
      ],
      [
        'left/right overlap',
        {
          configuration: {
            pairs: [
              { left: 0, right: 1 },
              { left: 1, right: 2 },
            ],
          },
        },
      ],
      [
        'an odd option count',
        {
          options: [
            { content: 'L1' },
            { content: 'R1' },
            { content: 'L2' },
            { content: 'R2' },
            { content: 'Odd one out' },
          ],
        },
      ],
      [
        'a reference to a non-existent order',
        {
          configuration: {
            pairs: [
              { left: 0, right: 1 },
              { left: 2, right: 7 },
            ],
          },
        },
      ],
      [
        'non-integer pair values',
        {
          configuration: {
            pairs: [
              { left: 0, right: 1 },
              { left: '2', right: 3 },
            ],
          },
        },
      ],
    ])('rejects %s with 400', async (_name, overrides) => {
      await createQuestion(matching(overrides), 400);
    });
  });

  describe('translation lifecycle', () => {
    it('translations survive merges when the option id survives, die with the option, and start empty for new options', async () => {
      const created = await createQuestion(singleChoice());
      const [correct, wrongA, wrongB] = created.answerOptions;

      await updateQuestion(created.id, {
        locale: Language.UKRAINIAN,
        title: 'Питання?',
        options: [
          { id: correct.id, content: 'Правильно' },
          { id: wrongB.id, content: 'Неправильно Б' },
        ],
      });

      // Merge: keep correct (edited), keep wrongB, delete wrongA, add new.
      const merged = await updateQuestion(created.id, {
        options: [
          { id: correct.id, content: 'Correct v2' },
          { id: wrongB.id },
          { content: 'Fresh option' },
        ],
      });
      const fresh = merged.answerOptions.find(
        (o) => o.content === 'Fresh option',
      ) as OptionBody;

      // Surviving option keeps its translation.
      const survivor = await prisma.answerOptionTranslation.findUnique({
        where: {
          answerOptionId_locale: {
            answerOptionId: correct.id,
            locale: Language.UKRAINIAN,
          },
        },
      });
      expect(survivor?.content).toBe('Правильно');

      // Deleted option's translation row is gone (cascade).
      const orphaned = await prisma.answerOptionTranslation.findMany({
        where: { answerOptionId: wrongA.id },
      });
      expect(orphaned).toHaveLength(0);

      // New option starts without translations.
      const freshTranslations = await prisma.answerOptionTranslation.findMany({
        where: { answerOptionId: fresh.id },
      });
      expect(freshTranslations).toHaveLength(0);
    });
  });

  describe('transactional integrity', () => {
    it('a failing update leaves scalars, options, and configuration untouched', async () => {
      const created = await createQuestion(matching());
      const [l1, r1, l2] = created.answerOptions;

      // Valid-looking scalar change + option merge that breaks the stored
      // configuration (a paired option is dropped) → 400, nothing persists.
      await updateQuestion(
        created.id,
        {
          title: 'Phase44 must not persist?',
          options: [
            { id: l1.id, content: 'L1 edited' },
            { id: r1.id },
            { id: l2.id },
            { content: 'Replacement' },
          ],
        },
        400,
      );

      const after = await fetchQuestion(created.id);
      expect(after.title).toBe(created.title);
      expect(after.configuration).toEqual(created.configuration);
      expect(after.answerOptions.map((o) => [o.id, o.content])).toEqual(
        created.answerOptions.map((o) => [o.id, o.content]),
      );
    });
  });

  describe('payload integrity', () => {
    it.each([
      [
        'duplicate ids',
        (o: OptionBody[]) => [
          { id: o[0].id },
          { id: o[0].id },
          { id: o[2].id },
        ],
      ],
      [
        'a foreign id',
        (_o: OptionBody[], foreign: string) => [
          { id: foreign },
          { content: 'X', isCorrect: true },
        ],
      ],
      [
        'duplicate explicit orders',
        (o: OptionBody[]) => [
          { id: o[0].id, order: 1 },
          { id: o[1].id, order: 1 },
          { id: o[2].id, order: 2 },
        ],
      ],
      [
        'mixed order presence',
        (o: OptionBody[]) => [
          { id: o[0].id, order: 1 },
          { id: o[1].id },
          { id: o[2].id },
        ],
      ],
    ])('rejects %s with 400', async (_name, build) => {
      const created = await createQuestion(singleChoice());
      const foreign = await createQuestion(singleChoice());

      await updateQuestion(
        created.id,
        {
          options: build(created.answerOptions, foreign.answerOptions[0].id),
        },
        400,
      );
    });
  });
});
