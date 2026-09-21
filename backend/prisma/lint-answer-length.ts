import { readFileSync, readdirSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The longest-answer giveaway.
 *
 * A single-choice question is guessable without knowing anything when its
 * correct option is visibly longer than the rest — the author had more to say
 * in the true statement than in the three false ones. Measured over the bank
 * in September 2026, the practice questions of history and Ukrainian had the
 * correct answer as the longest one in 64 % and 63 % of questions, against the
 * 25 % chance would give with four options: a learner who always pressed the
 * longest option scored about two thirds without reading anything.
 *
 * The correct answer being the longest is fine — it just cannot be the rule.
 * So this checks two things:
 *
 *  - **per question**: one that is longest *and* far longer than the others is
 *    a giveaway on sight. Those are listed by name in the baseline, and a new
 *    one fails the build.
 *  - **per pool** (a pack's questions of one format and option count): the
 *    share where the correct answer is the longest. It may never rise above
 *    what the baseline records, and the target is `TARGET_SHARE`.
 *
 * Run:
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/lint-answer-length.ts
 *   … --update-baseline   after fixing questions, to record the new state
 */

const ROOT = join(__dirname, 'seed', 'content');
const BASELINE_PATH = join(__dirname, 'answer-length-baseline.json');

/** A pool is only worth judging once it has this many questions. */
const MIN_POOL = 40;

/**
 * Where a pool should end up: chance for four options is 25 %, and a little
 * above it is natural — some true statements really are longer.
 */
const TARGET_SHARE = 0.35;

/** A giveaway: longest, and this much longer than the average wrong option. */
const GIVEAWAY_RATIO = 2;
/** …and at least this many characters clear of the longest wrong option. */
const GIVEAWAY_GAP = 20;

interface AuthoredQuestion {
  title: string;
  type?: string;
  format?: string;
  options?: (string | { content?: string; imageUrl?: string })[];
  correct?: number;
}

interface Baseline {
  /** Questions grandfathered in, as `pack/topic :: title`. */
  giveaways: string[];
  /** Share of «correct is longest», by pool key, as it stands today. */
  shares: Record<string, number>;
}

interface Pool {
  key: string;
  total: number;
  longest: number;
  giveaways: string[];
}

function optionText(
  option: NonNullable<AuthoredQuestion['options']>[number],
): string | null {
  if (typeof option === 'string') {
    return option;
  }
  // An option that is a picture has no length worth comparing.
  return option.imageUrl ? null : (option.content ?? null);
}

/** Every single-choice question of the packs, grouped into pools. */
function scan(): Map<string, Pool> {
  const pools = new Map<string, Pool>();
  const packs = readdirSync(ROOT).filter((entry) =>
    existsSync(join(ROOT, entry, 'subject.json')),
  );

  for (const pack of packs) {
    const topicsDir = join(ROOT, pack, 'topics');
    if (!existsSync(topicsDir)) continue;

    for (const file of readdirSync(topicsDir).sort()) {
      const topic = JSON.parse(readFileSync(join(topicsDir, file), 'utf8')) as {
        slug: string;
        questions: AuthoredQuestion[];
      };

      for (const question of topic.questions) {
        const measured = measure(question);
        if (!measured) continue;

        const key = `${pack}/${question.format ?? 'PRACTICE'}/${measured.count}`;
        const pool = pools.get(key) ?? {
          key,
          total: 0,
          longest: 0,
          giveaways: [],
        };
        pool.total += 1;
        if (measured.isLongest) {
          pool.longest += 1;
        }
        if (measured.isGiveaway) {
          pool.giveaways.push(`${pack}/${topic.slug} :: ${question.title}`);
        }
        pools.set(key, pool);
      }
    }
  }
  return pools;
}

function measure(
  question: AuthoredQuestion,
): { count: number; isLongest: boolean; isGiveaway: boolean } | null {
  if ((question.type ?? 'SINGLE_CHOICE') !== 'SINGLE_CHOICE') return null;
  if (!question.options || typeof question.correct !== 'number') return null;

  const texts = question.options.map(optionText);
  if (texts.some((text) => text === null) || texts.length < 3) return null;

  const lengths = (texts as string[]).map((text) => text.length);
  const correct = lengths[question.correct];
  const wrong = lengths.filter((_, index) => index !== question.correct);
  const longestWrong = Math.max(...wrong);
  const averageWrong = wrong.reduce((sum, one) => sum + one, 0) / wrong.length;

  const isLongest = correct > longestWrong;
  return {
    count: lengths.length,
    isLongest,
    isGiveaway:
      isLongest &&
      correct - longestWrong >= GIVEAWAY_GAP &&
      correct >= GIVEAWAY_RATIO * averageWrong,
  };
}

function readBaseline(): Baseline {
  if (!existsSync(BASELINE_PATH)) {
    return { giveaways: [], shares: {} };
  }
  return JSON.parse(readFileSync(BASELINE_PATH, 'utf8')) as Baseline;
}

function main(): void {
  const pools = [...scan().values()].sort((a, b) => a.key.localeCompare(b.key));
  const baseline = readBaseline();
  const known = new Set(baseline.giveaways);

  if (process.argv.includes('--update-baseline')) {
    const next: Baseline = {
      giveaways: pools.flatMap((pool) => pool.giveaways).sort(),
      shares: Object.fromEntries(
        pools
          .filter((pool) => pool.total >= MIN_POOL)
          .map((pool) => [pool.key, round(pool.longest / pool.total)]),
      ),
    };
    writeFileSync(BASELINE_PATH, `${JSON.stringify(next, null, 2)}\n`);
    console.log(
      `Baseline written: ${next.giveaways.length} giveaway question(s) across ${
        Object.keys(next.shares).length
      } pool(s).`,
    );
    return;
  }

  const errors: string[] = [];
  console.log('pool                                  total  longest  share');
  for (const pool of pools) {
    const share = pool.longest / pool.total;
    const judged = pool.total >= MIN_POOL;
    console.log(
      `${pool.key.padEnd(36)} ${String(pool.total).padStart(6)} ${String(
        pool.longest,
      ).padStart(8)}  ${(share * 100).toFixed(1)}%${
        judged && share > TARGET_SHARE ? '  ← above target' : ''
      }`,
    );

    if (judged) {
      const allowed = baseline.shares[pool.key];
      // The share may fall, never climb: fixed questions cannot be traded for
      // new ones written the same way.
      if (allowed !== undefined && round(share) > allowed) {
        errors.push(
          `${pool.key}: ${(share * 100).toFixed(1)} % of correct answers are the longest, up from ${(
            allowed * 100
          ).toFixed(
            1,
          )} % — write the wrong options at the length of the right one.`,
        );
      }
      if (allowed === undefined && share > TARGET_SHARE) {
        errors.push(
          `${pool.key}: ${(share * 100).toFixed(1)} % of correct answers are the longest (target ${(
            TARGET_SHARE * 100
          ).toFixed(0)} %).`,
        );
      }
    }

    for (const giveaway of pool.giveaways) {
      if (!known.has(giveaway)) {
        errors.push(
          `${giveaway}\n    the correct option is far longer than the others — a learner can pick it without reading.`,
        );
      }
    }
  }

  const outstanding = pools.reduce(
    (sum, pool) => sum + pool.giveaways.length,
    0,
  );
  console.log(`\nGiveaway questions still to rewrite: ${outstanding}`);

  if (errors.length > 0) {
    console.log('\n❌ Answer-length check failed:');
    errors.forEach((error) => console.log(`  ${error}`));
    process.exitCode = 1;
    return;
  }
  console.log('✅ Answer-length check passed.');
}

function round(share: number): number {
  return Math.round(share * 1000) / 1000;
}

main();
