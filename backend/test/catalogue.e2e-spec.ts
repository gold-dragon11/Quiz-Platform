import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { listenOnLoopback } from './loopback';

interface CatalogueBody {
  subjects: {
    name: string;
    slug: string;
    topics: string[];
    questionCount: number;
    materialCount: number;
  }[];
  totalQuestions: number;
  totalTopics: number;
  totalMaterials: number;
}

/**
 * The public catalogue behind the landing page.
 *
 * This is the only unauthenticated read of content in the whole API, so the
 * tests that matter are about what it must never leak, not about what it
 * returns.
 */
describe('Public catalogue (e2e)', () => {
  const PREFIX = 'cat-e2e';
  const URL = '/api/v1/catalogue';

  let app: INestApplication;
  let prisma: PrismaService;
  let publishedSubjectId: string;
  let hiddenSubjectId: string;
  let publishedTopicId: string;

  const removeFixtures = async (): Promise<void> => {
    await prisma.question.deleteMany({
      where: { topic: { slug: { startsWith: PREFIX } } },
    });
    await prisma.learningMaterial.deleteMany({
      where: { topic: { slug: { startsWith: PREFIX } } },
    });
    await prisma.topic.deleteMany({ where: { slug: { startsWith: PREFIX } } });
    await prisma.subject.deleteMany({
      where: { slug: { startsWith: PREFIX } },
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
    await listenOnLoopback(app);

    prisma = app.get(PrismaService);
    await removeFixtures();

    const published = await prisma.subject.create({
      data: {
        name: 'Каталог: опублікований',
        slug: `${PREFIX}-open`,
        isPublished: true,
        displayOrder: 800,
      },
    });
    publishedSubjectId = published.id;

    const hidden = await prisma.subject.create({
      data: {
        name: 'Каталог: чернетка',
        slug: `${PREFIX}-hidden`,
        isPublished: false,
        displayOrder: 801,
      },
    });
    hiddenSubjectId = hidden.id;

    const topic = await prisma.topic.create({
      data: {
        name: 'Відкрита тема',
        slug: `${PREFIX}-open-topic`,
        subjectId: publishedSubjectId,
        isPublished: true,
        displayOrder: 1,
      },
    });
    publishedTopicId = topic.id;

    await prisma.topic.create({
      data: {
        name: 'Прихована тема',
        slug: `${PREFIX}-hidden-topic`,
        subjectId: publishedSubjectId,
        isPublished: false,
        displayOrder: 2,
      },
    });

    await prisma.topic.create({
      data: {
        name: 'Тема під чернеткою',
        slug: `${PREFIX}-under-hidden`,
        subjectId: hiddenSubjectId,
        isPublished: true,
        displayOrder: 1,
      },
    });

    await prisma.question.createMany({
      data: [
        {
          topicId: publishedTopicId,
          type: 'SINGLE_CHOICE',
          title: 'Опубліковане питання каталогу',
          isPublished: true,
        },
        {
          topicId: publishedTopicId,
          type: 'SINGLE_CHOICE',
          title: 'Неопубліковане питання каталогу',
          isPublished: false,
        },
      ],
    });

    await prisma.learningMaterial.create({
      data: {
        topicId: publishedTopicId,
        subjectId: publishedSubjectId,
        title: 'Конспект відкритої теми',
        slug: `${PREFIX}-material`,
        displayOrder: 1,
        content: 'Конспект каталогу',
      },
    });
  });

  afterAll(async () => {
    await removeFixtures();
    await app.close();
  });

  const fetchCatalogue = async (): Promise<CatalogueBody> => {
    const response = await request(app.getHttpServer()).get(URL).expect(200);
    return response.body as CatalogueBody;
  };

  it('answers without a token — it is the landing page’s only source', async () => {
    await request(app.getHttpServer()).get(URL).expect(200);
  });

  it('hides an unpublished subject and everything under it', async () => {
    const body = await fetchCatalogue();
    const names = body.subjects.map((subject) => subject.name);

    expect(names).toContain('Каталог: опублікований');
    expect(names).not.toContain('Каталог: чернетка');
    expect(JSON.stringify(body)).not.toContain('Тема під чернеткою');
  });

  it('hides an unpublished topic of a published subject', async () => {
    const body = await fetchCatalogue();
    const subject = body.subjects.find((one) => one.slug === `${PREFIX}-open`);

    expect(subject?.topics).toContain('Відкрита тема');
    expect(subject?.topics).not.toContain('Прихована тема');
  });

  it('counts only published questions', async () => {
    const body = await fetchCatalogue();
    const subject = body.subjects.find((one) => one.slug === `${PREFIX}-open`);

    // Two questions exist under the topic; one is a draft.
    expect(subject?.questionCount).toBe(1);
  });

  it('never carries question text, answers or material bodies', async () => {
    const serialized = JSON.stringify(await fetchCatalogue());

    // The one unauthenticated window into the content. What it must not become
    // is a way to read the bank without an account.
    expect(serialized).not.toContain('Опубліковане питання каталогу');
    expect(serialized).not.toContain('Конспект каталогу');
    expect(serialized).not.toContain('isCorrect');
    expect(serialized).not.toContain('answerOptions');
  });

  it('carries totals that match the parts', async () => {
    const body = await fetchCatalogue();

    // The landing must never add these up itself: a page that computed its own
    // «3308» would be one filter away from advertising a different number.
    expect(body.totalQuestions).toBe(
      body.subjects.reduce((sum, subject) => sum + subject.questionCount, 0),
    );
    expect(body.totalTopics).toBe(
      body.subjects.reduce((sum, subject) => sum + subject.topics.length, 0),
    );
    expect(body.totalMaterials).toBe(
      body.subjects.reduce((sum, subject) => sum + subject.materialCount, 0),
    );
  });
});
