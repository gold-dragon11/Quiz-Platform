/**
 * Moves already-seeded questions onto their current titles.
 *
 * The seed identifies a question by `(topicId, title)`, so rewriting a title
 * makes it a different question: the next seed run creates a new row and
 * leaves the original published beside it. That is what happened locally
 * after the LaTeX conversion — 581 duplicates — and it will happen on every
 * other database that was seeded before a retitle unless this script runs
 * first.
 *
 * It compares the titles in a base commit against the titles in the working
 * tree, position by position, and for each difference moves the original row
 * onto the new title. Question ids survive, and so does every QuestionAttempt,
 * XP transaction and statistic pointing at them. If the seed has already run
 * and created the duplicate, the duplicate is removed — but only when nothing
 * has ever been answered through it.
 *
 * Idempotent: a question already carrying its current title is left alone, so
 * a database seeded for the first time after the retitle finds nothing to do,
 * and a second run of the script is a no-op.
 *
 * Dry run by default; `--write` applies the changes.
 *
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' \
 *     prisma/scripts/sync-retitled-questions.ts --base 870657b
 *
 * `870657b` is the commit before the LaTeX conversion — the last state that
 * production was seeded from. Against another database, pass the commit that
 * database was last seeded from.
 *
 * Run it against production before seeding:
 *
 *   DATABASE_URL="<neon url>" npx ts-node ... --base 870657b --write
 *
 * `--prune-orphans` additionally deletes questions that exist in the database
 * but in no content file — leftovers from an earlier repair. They are always
 * reported; deleting them is opt-in, and one that carries attempts is never
 * touched.
 *
 * Reads the base titles with `git show`, so it must run from a checkout of
 * this repository.
 */
import { PrismaClient } from '@prisma/client';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const REPO = join(__dirname, '..', '..', '..');
const CONTENT = 'backend/prisma/seed/content';

const prisma = new PrismaClient();

interface TopicFile {
  slug: string;
  questions: { title: string }[];
}

function flag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

/** Reads `--base <ref>` or `--base=<ref>`. */
function baseRef(): string {
  const index = process.argv.indexOf('--base');
  if (index !== -1 && process.argv[index + 1]) {
    return process.argv[index + 1];
  }
  const inline = process.argv.find((arg) => arg.startsWith('--base='));
  if (inline) {
    return inline.slice('--base='.length);
  }
  throw new Error(
    'missing --base <ref>: the commit this database was last seeded from ' +
      '(use 870657b for a database seeded before the LaTeX conversion)',
  );
}

/** The file as of the base commit, or null if it did not exist yet. */
function atBase(ref: string, path: string): TopicFile | null {
  try {
    const raw = execFileSync('git', ['show', `${ref}:${path}`], {
      cwd: REPO,
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return JSON.parse(raw) as TopicFile;
  } catch {
    return null;
  }
}

function subjects(): string[] {
  return readdirSync(join(REPO, CONTENT), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function topicFiles(subject: string): string[] {
  const dir = join(REPO, CONTENT, subject, 'topics');
  try {
    return readdirSync(dir)
      .filter((file) => file.endsWith('.json'))
      .sort();
  } catch {
    return [];
  }
}

const counters = {
  renamed: 0,
  duplicatesRemoved: 0,
  alreadyCurrent: 0,
  notFound: 0,
  orphans: 0,
  orphansRemoved: 0,
  filesSkipped: 0,
};

/** Deletes a question and the answer options that hang off it. */
async function deleteQuestion(id: string): Promise<void> {
  await prisma.answerOption.deleteMany({ where: { questionId: id } });
  await prisma.question.delete({ where: { id } });
}

/**
 * Moves each retitled question onto its current title, returning the ids it
 * handled. On a dry run nothing is written, so those ids still carry their old
 * title in the database — the orphan pass needs them to avoid reporting a
 * pending rename as a question no file claims.
 */
async function syncTopic(
  subject: string,
  topicId: string,
  slug: string,
  before: TopicFile,
  after: TopicFile,
  write: boolean,
): Promise<Set<string>> {
  const handled = new Set<string>();
  for (let i = 0; i < before.questions.length; i += 1) {
    const oldTitle = before.questions[i].title;
    const newTitle = after.questions[i].title;
    if (oldTitle === newTitle) {
      continue;
    }

    const original = await prisma.question.findFirst({
      where: { topicId, title: oldTitle },
      select: { id: true },
    });
    const duplicate = await prisma.question.findFirst({
      where: { topicId, title: newTitle },
      select: { id: true },
    });

    if (!original) {
      if (duplicate) {
        counters.alreadyCurrent += 1;
      } else {
        counters.notFound += 1;
        console.log(
          `  ${subject}/${slug}: neither title present — "${oldTitle}"`,
        );
      }
      continue;
    }

    if (duplicate) {
      // Created by a seed run after the retitle. It can only carry history if
      // learners answered it in the window between that run and this repair.
      const attempts = await prisma.questionAttempt.count({
        where: { questionId: duplicate.id },
      });
      if (attempts > 0) {
        console.log(
          `  ${subject}/${slug}: duplicate of "${newTitle}" has ${attempts} attempts — left alone`,
        );
        continue;
      }
      if (write) {
        await deleteQuestion(duplicate.id);
      }
      counters.duplicatesRemoved += 1;
    }

    if (write) {
      await prisma.question.update({
        where: { id: original.id },
        data: { title: newTitle },
      });
    }
    counters.renamed += 1;
    handled.add(original.id);
  }

  return handled;
}

/** Questions in the database that no content file claims any more. */
async function reportOrphans(
  subject: string,
  topicId: string,
  slug: string,
  after: TopicFile,
  renamed: Set<string>,
  write: boolean,
  prune: boolean,
): Promise<void> {
  const titles = new Set(after.questions.map((question) => question.title));
  const rows = await prisma.question.findMany({
    where: { topicId },
    select: { id: true, title: true, _count: { select: { attempts: true } } },
  });

  for (const row of rows) {
    if (titles.has(row.title) || renamed.has(row.id)) {
      continue;
    }
    counters.orphans += 1;
    const attempts = row._count.attempts;
    const label = `  ${subject}/${slug}: orphan "${row.title.slice(0, 70)}" (${attempts} attempts)`;

    if (!prune || attempts > 0) {
      console.log(`${label}${prune ? ' — kept, it has history' : ''}`);
      continue;
    }
    if (write) {
      await deleteQuestion(row.id);
    }
    counters.orphansRemoved += 1;
    console.log(`${label} — removed`);
  }
}

async function main(): Promise<void> {
  const ref = baseRef();
  const write = flag('write');
  const prune = flag('prune-orphans');

  for (const subject of subjects()) {
    for (const file of topicFiles(subject)) {
      const path = `${CONTENT}/${subject}/topics/${file}`;
      const before = atBase(ref, path);
      if (!before) {
        continue; // the topic did not exist at the base commit
      }
      const after = JSON.parse(
        readFileSync(join(REPO, path), 'utf8'),
      ) as TopicFile;

      const topic = await prisma.topic.findFirst({
        where: { slug: after.slug, subject: { slug: subject } },
        select: { id: true },
      });
      if (!topic) {
        continue; // the topic is not in this database
      }

      let renamed = new Set<string>();
      if (before.questions.length === after.questions.length) {
        renamed = await syncTopic(
          subject,
          topic.id,
          after.slug,
          before,
          after,
          write,
        );
      } else {
        // Positional matching would pair unrelated questions.
        counters.filesSkipped += 1;
        console.log(
          `  ${subject}/${after.slug}: ${before.questions.length} → ${after.questions.length} questions, ` +
            'renames skipped (positions no longer line up)',
        );
      }

      await reportOrphans(
        subject,
        topic.id,
        after.slug,
        after,
        renamed,
        write,
        prune,
      );
    }
  }

  console.log(
    `\nbase ${ref} — renamed: ${counters.renamed}  duplicates removed: ${counters.duplicatesRemoved}  ` +
      `already current: ${counters.alreadyCurrent}  not found: ${counters.notFound}\n` +
      `orphans: ${counters.orphans} (removed ${counters.orphansRemoved})  files skipped: ${counters.filesSkipped}  ` +
      `(${write ? 'written' : 'dry run'})`,
  );
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
