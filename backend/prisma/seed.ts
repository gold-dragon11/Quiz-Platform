import { Difficulty, PrismaClient, QuestionType } from '@prisma/client';
import { loadSubject } from './seed/load';
import { isMatching, questionType, type QuestionContent } from './seed/types';

/**
 * Learning-content seed (Phase 7.0).
 *
 * Idempotent by natural key: subjects by `slug`, topics by `(subjectId, slug)`,
 * questions by `(topicId, title)`. Re-running never duplicates content and
 * never deletes questions, so historical Quiz Sessions stay valid
 * (docs/02-domain/question.md §12).
 *
 * Everything is seeded published, so the full publication chain
 * (subject → topic → question) holds and the content is immediately quizzable.
 */

const prisma = new PrismaClient();

/** Subject content packs to seed, in order. */
const SUBJECT_PACKS = [
  'mathematics',
  'history-of-ukraine',
  'ukrainian-language',
  'english-language',
];

interface Counters {
  topicsCreated: number;
  topicsUpdated: number;
  questionsCreated: number;
  questionsUpdated: number;
  questionsUnchanged: number;
}

async function seedSubject(
  dir: string,
  order: number,
  counters: Counters,
): Promise<void> {
  const { subject, topics } = loadSubject(dir);

  const subjectRow = await prisma.subject.upsert({
    where: { slug: subject.slug },
    update: {
      name: subject.name,
      description: subject.description ?? null,
      icon: subject.icon ?? null,
      color: subject.color ?? null,
      isPublished: true,
      // Keep catalog order deterministic as more packs are added.
      displayOrder: order,
      deletedAt: null,
    },
    create: {
      name: subject.name,
      slug: subject.slug,
      description: subject.description ?? null,
      icon: subject.icon ?? null,
      color: subject.color ?? null,
      isPublished: true,
      displayOrder: order,
    },
  });

  for (const [index, topic] of topics.entries()) {
    const existingTopic = await prisma.topic.findUnique({
      where: { subjectId_slug: { subjectId: subjectRow.id, slug: topic.slug } },
    });

    const topicRow = await prisma.topic.upsert({
      where: { subjectId_slug: { subjectId: subjectRow.id, slug: topic.slug } },
      update: {
        name: topic.name,
        description: topic.description ?? null,
        displayOrder: index,
        isPublished: true,
        deletedAt: null,
      },
      create: {
        subjectId: subjectRow.id,
        name: topic.name,
        slug: topic.slug,
        description: topic.description ?? null,
        displayOrder: index,
        isPublished: true,
      },
    });

    if (existingTopic) {
      counters.topicsUpdated += 1;
    } else {
      counters.topicsCreated += 1;
    }

    for (const question of topic.questions) {
      await seedQuestion(topicRow.id, question, counters);
    }
  }
}

/**
 * Deterministic 32-bit hash of a string — used to seed the option shuffle so
 * the same question always produces the same option order across runs (the
 * seed stays idempotent) while different questions differ.
 */
function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Seeded Fisher–Yates: same input always yields the same permutation. */
function shuffled<T>(items: T[], seed: number): T[] {
  const result = [...items];
  let state = seed || 1;
  for (let i = result.length - 1; i > 0; i -= 1) {
    // xorshift32 keeps this dependency-free and reproducible.
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    const j = state % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** Flattens authoring content into the option rows + configuration the engine expects. */
function buildAnswers(question: QuestionContent): {
  options: { content: string; isCorrect: boolean; order: number }[];
  configuration: { pairs: { left: number; right: number }[] } | null;
} {
  if (isMatching(question)) {
    // Block layout: every left item first (orders 0..n-1), then every right
    // item (orders n..2n-1). The two sides stay disjoint — which is what the
    // backend requires — and the halves line up with how the quiz UI splits a
    // matching question into a left prompt column and a right choice column.
    const n = question.pairs.length;
    const options = [
      ...question.pairs.map(([left], i) => ({
        content: left,
        isCorrect: false,
        order: i,
      })),
      ...question.pairs.map(([, right], i) => ({
        content: right,
        isCorrect: false,
        order: n + i,
      })),
    ];
    return {
      options,
      configuration: {
        pairs: question.pairs.map((_, i) => ({ left: i, right: n + i })),
      },
    };
  }

  // Content files always author the correct answer first for readability, but
  // the engine serves options in stored order without shuffling. Permuting
  // here (deterministically, keyed by the title) spreads correct answers
  // across all positions so the position itself never gives the answer away.
  const permuted = shuffled(
    question.options.map((content, index) => ({
      content,
      isCorrect: index === question.correct,
    })),
    hash(question.title),
  );

  return {
    options: permuted.map((option, order) => ({ ...option, order })),
    configuration: null,
  };
}

async function seedQuestion(
  topicId: string,
  question: QuestionContent,
  counters: Counters,
): Promise<void> {
  const { options, configuration } = buildAnswers(question);
  const type = questionType(question);
  const difficulty = Difficulty[question.difficulty];

  const existing = await prisma.question.findFirst({
    where: { topicId, title: question.title },
    include: { answerOptions: { orderBy: { order: 'asc' } } },
  });

  // Authored as optional; an absent note stores NULL rather than an empty
  // string, so "has no explanation" is one state in the database, not two.
  const explanation = question.explanation ?? null;

  if (!existing) {
    await prisma.question.create({
      data: {
        topicId,
        type,
        title: question.title,
        difficulty,
        explanation,
        configuration: configuration ?? undefined,
        isPublished: true,
        answerOptions: { create: options },
      },
    });
    counters.questionsCreated += 1;
    return;
  }

  // Only rewrite when the authored content actually differs, so a repeat run
  // is a true no-op and option ids stay stable for historical attempts.
  const optionsMatch =
    existing.answerOptions.length === options.length &&
    existing.answerOptions.every(
      (row, i) =>
        row.content === options[i].content &&
        row.isCorrect === options[i].isCorrect &&
        row.order === options[i].order,
    );
  const scalarsMatch =
    existing.type === type &&
    existing.difficulty === difficulty &&
    existing.explanation === explanation &&
    existing.isPublished &&
    existing.deletedAt === null &&
    JSON.stringify(existing.configuration ?? null) ===
      JSON.stringify(configuration);

  if (optionsMatch && scalarsMatch) {
    counters.questionsUnchanged += 1;
    return;
  }

  await prisma.$transaction(async (tx) => {
    if (!optionsMatch) {
      await tx.answerOption.deleteMany({ where: { questionId: existing.id } });
    }
    await tx.question.update({
      where: { id: existing.id },
      data: {
        type,
        difficulty,
        explanation,
        configuration: configuration ?? undefined,
        isPublished: true,
        deletedAt: null,
        ...(optionsMatch ? {} : { answerOptions: { create: options } }),
      },
    });
  });
  counters.questionsUpdated += 1;
}

async function main(): Promise<void> {
  const counters: Counters = {
    topicsCreated: 0,
    topicsUpdated: 0,
    questionsCreated: 0,
    questionsUpdated: 0,
    questionsUnchanged: 0,
  };

  for (const [index, pack] of SUBJECT_PACKS.entries()) {
    console.log(`Seeding subject pack: ${pack}`);
    await seedSubject(pack, index, counters);
  }

  const totals = await prisma.question.groupBy({
    by: ['difficulty'],
    _count: { _all: true },
    where: { deletedAt: null },
  });

  console.log('\nSeed complete.');
  console.log(
    `  topics    : ${counters.topicsCreated} created, ${counters.topicsUpdated} updated`,
  );
  console.log(
    `  questions : ${counters.questionsCreated} created, ${counters.questionsUpdated} updated, ${counters.questionsUnchanged} unchanged`,
  );
  for (const row of totals) {
    console.log(`  ${row.difficulty ?? 'UNSET'}: ${row._count._all}`);
  }
  console.log(
    `  matching  : ${await prisma.question.count({ where: { type: QuestionType.MATCHING, deletedAt: null } })}`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
