import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Authoring-quality linter for seed content (Phase 7.2).
 *
 * The seed validator enforces what the *database* requires; this catches
 * authoring slips that are structurally legal but wrong for learners:
 * stray keys, leftover editing notes, script mixing, and duplicated examples.
 *
 * Run: npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/lint-content.ts
 */

const ROOT = join(__dirname, 'seed', 'content');

const ALLOWED_KEYS = new Set([
  'title',
  'difficulty',
  'type',
  'options',
  'correct',
  'pairs',
]);

/** Latin letters that look Cyrillic — a classic copy-paste hazard. */
const CONFUSABLE = /[a-zA-Z]/;
/** Leftover editorial notes that must never reach a learner. */
const EDITORIAL =
  /(некоректн|правильна відповідь|беремо:|отже:|варіант\s*—|TODO|FIXME|\?\?)/i;
/** CJK or other scripts that have no business in this content. */
const FOREIGN_SCRIPT = /[一-鿿぀-ヿ؀-ۿ]/;

interface Question {
  title: string;
  type?: string;
  options?: string[];
  correct?: number;
  pairs?: [string, string][];
  [key: string]: unknown;
}

function lintPack(pack: string): { errors: string[]; warnings: string[] } {
  const problems: string[] = [];
  const warnings: string[] = [];
  const topicsDir = join(ROOT, pack, 'topics');
  if (!existsSync(topicsDir)) return { errors: problems, warnings };

  // Cross-topic duplicate detection: the same question in two topics is a
  // quality failure the per-topic validator cannot see.
  const titlesAcrossPack = new Map<string, string>();

  for (const file of readdirSync(topicsDir).sort()) {
    const topic = JSON.parse(readFileSync(join(topicsDir, file), 'utf8')) as {
      slug: string;
      questions: Question[];
    };

    topic.questions.forEach((q, i) => {
      const at = `${pack}/${topic.slug}[${i}]`;

      for (const key of Object.keys(q)) {
        if (!ALLOWED_KEYS.has(key)) {
          problems.push(`${at}: unexpected key "${key}"`);
        }
      }

      const texts = [
        q.title,
        ...(q.options ?? []),
        ...(q.pairs ?? []).flat(),
      ].filter((t): t is string => typeof t === 'string');

      for (const text of texts) {
        if (EDITORIAL.test(text)) {
          problems.push(
            `${at}: editorial note left in text — "${text.slice(0, 60)}"`,
          );
        }
        if (FOREIGN_SCRIPT.test(text)) {
          problems.push(
            `${at}: foreign script in text — "${text.slice(0, 60)}"`,
          );
        }
        if (/\s—\S|\S—\s/.test(text)) {
          problems.push(
            `${at}: em dash without surrounding spaces — "${text.slice(0, 60)}"`,
          );
        }
        if (/\s{2,}/.test(text)) {
          problems.push(`${at}: double space — "${text.slice(0, 60)}"`);
        }
      }

      // Latin characters are legitimate in some packs (maths symbols, English
      // terms), so only flag them for the Ukrainian-language pack.
      if (pack === 'ukrainian-language') {
        for (const text of texts) {
          const latin = text.match(/[a-zA-Z]+/g);
          if (latin && CONFUSABLE.test(text)) {
            problems.push(
              `${at}: Latin letters "${latin.join(',')}" in "${text.slice(0, 50)}"`,
            );
          }
        }
      }

      // Repeated stems across topics are legal (the seed keys on
      // topicId + title) but read as template wording, so they are a
      // quality warning rather than a hard failure.
      const key = q.title.trim().toLowerCase();
      const seenIn = titlesAcrossPack.get(key);
      if (seenIn && seenIn !== topic.slug) {
        warnings.push(`${at}: repeated stem, also in topic "${seenIn}"`);
      }
      titlesAcrossPack.set(key, topic.slug);
    });
  }

  return { errors: problems, warnings };
}

function main(): void {
  const packs = readdirSync(ROOT).filter((d) =>
    existsSync(join(ROOT, d, 'subject.json')),
  );

  let totalErrors = 0;
  let totalWarnings = 0;
  for (const pack of packs) {
    const { errors, warnings } = lintPack(pack);
    totalErrors += errors.length;
    totalWarnings += warnings.length;
    console.log(
      `${pack}: ${errors.length} error(s), ${warnings.length} warning(s)`,
    );
    errors.forEach((p) => console.log(`  ERROR   ${p}`));
    warnings.forEach((p) => console.log(`  warning ${p}`));
  }

  console.log(
    totalErrors === 0
      ? `\n✅ Content lint passed (${totalWarnings} warning(s)).`
      : `\n❌ ${totalErrors} error(s), ${totalWarnings} warning(s).`,
  );
  process.exitCode = totalErrors === 0 ? 0 : 1;
}

main();
