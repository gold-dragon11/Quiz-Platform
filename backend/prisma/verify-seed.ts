import { PrismaClient, QuestionType } from '@prisma/client';

/**
 * Post-seed integrity report (Phase 7.0). Read-only: verifies the publication
 * chain, per-type answer invariants, and that the content is quizzable.
 * Run with: npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/verify-seed.ts
 */
const prisma = new PrismaClient();

interface Pair {
  left: number;
  right: number;
}

function readPairs(configuration: unknown): Pair[] {
  if (!configuration || typeof configuration !== 'object') return [];
  const raw = (configuration as { pairs?: unknown }).pairs;
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (p): p is Pair =>
      typeof p === 'object' &&
      p !== null &&
      Number.isInteger((p as Pair).left) &&
      Number.isInteger((p as Pair).right),
  );
}

async function main(): Promise<void> {
  const problems: string[] = [];

  const subject = await prisma.subject.findUnique({
    where: { slug: 'mathematics' },
    include: {
      topics: { where: { deletedAt: null }, orderBy: { displayOrder: 'asc' } },
    },
  });

  if (!subject) throw new Error('Mathematics subject not found');

  console.log(`Subject : ${subject.name} (published=${subject.isPublished})`);
  if (!subject.isPublished) problems.push('subject is not published');
  console.log(`Topics  : ${subject.topics.length}`);

  let total = 0;
  console.log('\nPer-topic counts:');
  for (const topic of subject.topics) {
    const count = await prisma.question.count({
      where: { topicId: topic.id, deletedAt: null },
    });
    total += count;
    if (!topic.isPublished)
      problems.push(`topic "${topic.slug}" is not published`);
    if (count < 40)
      problems.push(`topic "${topic.slug}" has only ${count} questions`);
    console.log(
      `  ${topic.displayOrder.toString().padStart(2)} ${topic.slug.padEnd(24)} ${count}`,
    );
  }
  console.log(`\nTotal questions: ${total}`);

  // Difficulty mix
  const byDifficulty = await prisma.question.groupBy({
    by: ['difficulty'],
    _count: { _all: true },
    where: { deletedAt: null, topic: { subjectId: subject.id } },
  });
  console.log('\nDifficulty distribution:');
  for (const d of byDifficulty) {
    const pct = ((d._count._all / total) * 100).toFixed(1);
    console.log(
      `  ${(d.difficulty ?? 'UNSET').padEnd(13)} ${d._count._all} (${pct} %)`,
    );
    if (d.difficulty === null)
      problems.push('some questions have no difficulty');
  }

  // Answer invariants
  const questions = await prisma.question.findMany({
    where: { deletedAt: null, topic: { subjectId: subject.id } },
    include: { answerOptions: { orderBy: { order: 'asc' } } },
  });

  let unpublished = 0;
  for (const q of questions) {
    if (!q.isPublished) unpublished += 1;
    if (q.answerOptions.length < 2) {
      problems.push(`question "${q.title.slice(0, 40)}…" has < 2 options`);
      continue;
    }
    const orders = q.answerOptions.map((o) => o.order);
    if (new Set(orders).size !== orders.length) {
      problems.push(
        `question "${q.title.slice(0, 40)}…" has duplicate option orders`,
      );
    }

    if (q.type === QuestionType.SINGLE_CHOICE) {
      const correct = q.answerOptions.filter((o) => o.isCorrect).length;
      if (correct !== 1) {
        problems.push(
          `single-choice "${q.title.slice(0, 40)}…" has ${correct} correct options`,
        );
      }
      if (q.configuration !== null) {
        problems.push(
          `single-choice "${q.title.slice(0, 40)}…" unexpectedly has configuration`,
        );
      }
    } else {
      const pairs = readPairs(q.configuration);
      if (pairs.length < 2) {
        problems.push(`matching "${q.title.slice(0, 40)}…" has < 2 pairs`);
      }
      if (q.answerOptions.length !== pairs.length * 2) {
        problems.push(
          `matching "${q.title.slice(0, 40)}…" option/pair count mismatch`,
        );
      }
      const valid = new Set(orders);
      const lefts = new Set<number>();
      const rights = new Set<number>();
      for (const p of pairs) {
        if (!valid.has(p.left) || !valid.has(p.right)) {
          problems.push(
            `matching "${q.title.slice(0, 40)}…" references unknown option order`,
          );
        }
        if (p.left === p.right)
          problems.push(`matching "${q.title.slice(0, 40)}…" has a self pair`);
        lefts.add(p.left);
        rights.add(p.right);
      }
      for (const l of lefts) {
        if (rights.has(l)) {
          problems.push(
            `matching "${q.title.slice(0, 40)}…" has an order on both sides`,
          );
        }
      }
    }
  }
  if (unpublished > 0)
    problems.push(`${unpublished} questions are not published`);

  const byType = await prisma.question.groupBy({
    by: ['type'],
    _count: { _all: true },
    where: { deletedAt: null, topic: { subjectId: subject.id } },
  });
  console.log('\nQuestion types:');
  for (const t of byType)
    console.log(`  ${t.type.padEnd(15)} ${t._count._all}`);

  // Quizzability: the exact publication chain the quiz engine requires.
  const quizzable = await prisma.question.count({
    where: {
      deletedAt: null,
      isPublished: true,
      topic: {
        deletedAt: null,
        isPublished: true,
        subject: { deletedAt: null, isPublished: true },
      },
    },
  });
  console.log(`\nQuestions passing the full publication chain: ${quizzable}`);
  if (quizzable < total)
    problems.push('some questions fail the publication chain');

  console.log(
    problems.length === 0
      ? '\n✅ All integrity checks passed.'
      : `\n❌ ${problems.length} problem(s):\n  - ${problems.join('\n  - ')}`,
  );
  process.exitCode = problems.length === 0 ? 0 : 1;
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => void prisma.$disconnect());
