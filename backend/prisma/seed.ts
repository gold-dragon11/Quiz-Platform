import { Difficulty, PrismaClient, QuestionType } from '@prisma/client';
import { loadSubject } from './seed/load';
import { loadMaterials, type MaterialContent } from './seed/materials';
import {
  isMatching,
  isMultipleChoice,
  isNumeric,
  isOrdering,
  questionFormat,
  questionType,
  type PassageContent,
  type QuestionContent,
} from './seed/types';
import { estimateReadingTime } from '../src/learning-materials/learning-material.constants';

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
  materialsCreated: number;
  materialsUpdated: number;
  materialsSkipped: number;
  passagesCreated: number;
  passagesUpdated: number;
}

/** Where a question sits relative to its text; both null when it stands alone. */
interface Placement {
  passageId: string | null;
  passageOrder: number | null;
}

/**
 * Upserts one material by its natural key `(subjectId, slug)`, the same
 * identity the authoring file carries, so re-running the seed edits the
 * existing row instead of accumulating copies.
 *
 * A material whose slug matches no topic is skipped rather than seeded
 * subject-wide: the file is named after a topic, so an unmatched name is a
 * typo or a topic yet to be written, and attaching it to nothing would hide
 * that.
 */
async function seedMaterial(
  subjectId: string,
  topicIdBySlug: Map<string, string>,
  displayOrder: number,
  material: MaterialContent,
  counters: Counters,
): Promise<void> {
  const topicId = topicIdBySlug.get(material.slug);
  if (!topicId) {
    console.warn(
      `  ! material "${material.slug}" matches no topic in this subject — skipped`,
    );
    counters.materialsSkipped += 1;
    return;
  }

  const existing = await prisma.learningMaterial.findUnique({
    where: { subjectId_slug: { subjectId, slug: material.slug } },
    select: { id: true },
  });

  const fields = {
    topicId,
    title: material.title,
    description: material.description ?? null,
    content: material.content,
    // Derived, never authored, so it cannot drift from the text.
    estimatedReadingTime: estimateReadingTime(material.content),
    displayOrder,
    isPublished: true,
    deletedAt: null,
  };

  await prisma.learningMaterial.upsert({
    where: { subjectId_slug: { subjectId, slug: material.slug } },
    update: fields,
    create: { subjectId, slug: material.slug, ...fields },
  });

  if (existing) {
    counters.materialsUpdated += 1;
  } else {
    counters.materialsCreated += 1;
  }
}

async function seedSubject(
  dir: string,
  order: number,
  counters: Counters,
): Promise<void> {
  const { subject, topics } = loadSubject(dir);
  const materials = loadMaterials(dir);
  const topicIdBySlug = new Map<string, string>();

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

    topicIdBySlug.set(topic.slug, topicRow.id);

    if (existingTopic) {
      counters.topicsUpdated += 1;
    } else {
      counters.topicsCreated += 1;
    }

    // Passages first: a question names its text by key, and the key only
    // becomes an id once the passage row exists.
    const passageIdByKey = new Map<string, string>();
    for (const passage of topic.passages ?? []) {
      passageIdByKey.set(
        passage.key,
        await seedPassage(topicRow.id, passage, counters),
      );
    }

    // A question's position in its passage is its order among that passage's
    // questions in the file — which is also the gap it fills, since the
    // validator holds the numbered gaps to the same order.
    const positions = new Map<string, number>();
    for (const question of topic.questions) {
      let placement: Placement = { passageId: null, passageOrder: null };
      if (question.passage !== undefined) {
        const passageOrder = (positions.get(question.passage) ?? 0) + 1;
        positions.set(question.passage, passageOrder);
        placement = {
          passageId: passageIdByKey.get(question.passage) ?? null,
          passageOrder,
        };
      }
      await seedQuestion(topicRow.id, question, placement, counters);
    }
  }

  for (const [index, material] of materials.entries()) {
    await seedMaterial(subjectRow.id, topicIdBySlug, index, material, counters);
  }
}

/**
 * Upserts one passage by its natural key `(topicId, slug)` and returns its id.
 * Rewording the text keeps the key, so it edits the row in place — the
 * questions that point at it do not move.
 */
async function seedPassage(
  topicId: string,
  passage: PassageContent,
  counters: Counters,
): Promise<string> {
  const title = passage.title ?? null;
  const existing = await prisma.passage.findUnique({
    where: { topicId_slug: { topicId, slug: passage.key } },
  });

  if (!existing) {
    const created = await prisma.passage.create({
      data: { topicId, slug: passage.key, title, content: passage.content },
      select: { id: true },
    });
    counters.passagesCreated += 1;
    return created.id;
  }

  if (existing.title !== title || existing.content !== passage.content) {
    await prisma.passage.update({
      where: { id: existing.id },
      data: { title, content: passage.content },
    });
    counters.passagesUpdated += 1;
  }
  return existing.id;
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
  options: {
    content: string;
    isCorrect: boolean;
    order: number;
    imageUrl?: string | null;
  }[];
  configuration:
    { pairs: { left: number; right: number }[] } | { answer: number } | null;
} {
  if (isMatching(question)) {
    // Block layout: every prompt first (orders 0..n-1), then every choice
    // (orders n onwards). The two sides stay disjoint — which is what the
    // backend requires — and the leading block is how the delivery side knows
    // where the prompts end, which is what lets a question offer more choices
    // than it has prompts.
    const n = question.pairs.length;
    const spare = question.extraChoices ?? [];
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
      ...spare.map((content, i) => ({
        content,
        isCorrect: false,
        order: 2 * n + i,
      })),
    ];
    return {
      options,
      configuration: {
        pairs: question.pairs.map((_, i) => ({ left: i, right: n + i })),
      },
    };
  }

  if (isNumeric(question)) {
    // No options at all: the answer is a number, and the client must never
    // receive it.
    return { options: [], configuration: { answer: question.answer } };
  }

  if (isOrdering(question)) {
    // The authored sequence is the answer, so it is stored as the option
    // order untouched. Nothing is shuffled here: the delivery view deals
    // these options per session, which is where the reader meets them.
    return {
      options: question.sequence.map((content, order) => ({
        content,
        isCorrect: false,
        order,
      })),
      configuration: null,
    };
  }

  if (isMultipleChoice(question)) {
    const correct = new Set(question.correct);
    const permuted = shuffled(
      question.options.map((content, index) => ({
        content,
        isCorrect: correct.has(index),
      })),
      hash(question.title),
    );
    return {
      options: permuted.map((option, order) => ({ ...option, order })),
      configuration: null,
    };
  }

  // Content files always author the correct answer first for readability, but
  // the engine serves options in stored order without shuffling. Permuting
  // here (deterministically, keyed by the title) spreads correct answers
  // across all positions so the position itself never gives the answer away.
  const permuted = shuffled(
    question.options.map((option, index) => ({
      content: typeof option === 'string' ? option : option.content,
      imageUrl: typeof option === 'string' ? null : option.imageUrl,
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
  placement: Placement,
  counters: Counters,
): Promise<void> {
  const { options, configuration } = buildAnswers(question);
  const type = questionType(question);
  const format = questionFormat(question);
  const difficulty = Difficulty[question.difficulty];

  const existing = await prisma.question.findFirst({
    where: { topicId, title: question.title },
    include: { answerOptions: { orderBy: { order: 'asc' } } },
  });

  // Authored as optional; an absent note stores NULL rather than an empty
  // string, so "has no explanation" is one state in the database, not two.
  const explanation = question.explanation ?? null;
  const imageUrl = question.imageUrl ?? null;

  if (!existing) {
    await prisma.question.create({
      data: {
        topicId,
        type,
        format,
        title: question.title,
        difficulty,
        explanation,
        imageUrl,
        ...placement,
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
        (row.imageUrl ?? null) === (options[i].imageUrl ?? null) &&
        row.isCorrect === options[i].isCorrect &&
        row.order === options[i].order,
    );
  const scalarsMatch =
    existing.type === type &&
    existing.format === format &&
    existing.difficulty === difficulty &&
    existing.explanation === explanation &&
    existing.imageUrl === imageUrl &&
    existing.passageId === placement.passageId &&
    existing.passageOrder === placement.passageOrder &&
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
        format,
        difficulty,
        explanation,
        imageUrl,
        ...placement,
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
    materialsCreated: 0,
    materialsUpdated: 0,
    materialsSkipped: 0,
    passagesCreated: 0,
    passagesUpdated: 0,
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
    `  passages  : ${counters.passagesCreated} created, ${counters.passagesUpdated} updated`,
  );
  console.log(
    `  materials : ${counters.materialsCreated} created, ${counters.materialsUpdated} updated, ${counters.materialsSkipped} skipped`,
  );
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
