/**
 * Retitles seeded mathematics questions in place after the LaTeX conversion.
 *
 * The seed identifies a question by `(topicId, title)`, so rewriting a title
 * makes it a different question: the run that followed the conversion created
 * 581 new rows and left the originals published beside them. This script
 * repairs that by moving each original onto its new title and removing the
 * duplicate the seed created, so question ids — and every QuestionAttempt
 * pointing at them — survive the change.
 *
 * Idempotent: a question already carrying its new title is left alone, and it
 * is safe to run before the duplicates exist (on a database seeded for the
 * first time after the conversion, it finds nothing to do).
 *
 * Run it once against each database that was seeded before the conversion:
 *
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' \
 *     prisma/scripts/rename-latex-questions.ts --write
 *
 * It reads the pre-conversion titles from git (`HEAD` at the time of the
 * conversion commit), so it must run from a checkout of this repository.
 */
import { PrismaClient } from '@prisma/client';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const REPO = join(__dirname, '..', '..', '..');
const CONTENT = 'backend/prisma/seed/content/mathematics/topics';
const WRITE = process.argv.includes('--write');

const prisma = new PrismaClient();

interface TopicFile {
  slug: string;
  questions: { title: string }[];
}

function atHead(path: string): TopicFile {
  const raw = execFileSync('git', ['show', `HEAD:${path}`], {
    cwd: REPO,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });
  return JSON.parse(raw) as TopicFile;
}

async function main(): Promise<void> {
  let renamed = 0;
  let removed = 0;
  let alreadyCurrent = 0;
  let missing = 0;

  for (const file of readdirSync(join(REPO, CONTENT)).sort()) {
    if (!file.endsWith('.json')) {
      continue;
    }
    const path = `${CONTENT}/${file}`;
    const before = atHead(path);
    const after = JSON.parse(
      readFileSync(join(REPO, path), 'utf8'),
    ) as TopicFile;

    if (before.questions.length !== after.questions.length) {
      throw new Error(`${file}: question count changed; refusing to guess`);
    }

    const topic = await prisma.topic.findFirst({
      where: { slug: after.slug, subject: { slug: 'mathematics' } },
      select: { id: true },
    });
    if (!topic) {
      console.log(`${after.slug}: topic not in this database, skipped`);
      continue;
    }

    for (let i = 0; i < before.questions.length; i += 1) {
      const oldTitle = before.questions[i].title;
      const newTitle = after.questions[i].title;
      if (oldTitle === newTitle) {
        continue;
      }

      const original = await prisma.question.findFirst({
        where: { topicId: topic.id, title: oldTitle },
        select: { id: true },
      });
      const duplicate = await prisma.question.findFirst({
        where: { topicId: topic.id, title: newTitle },
        select: { id: true },
      });

      if (!original) {
        if (duplicate) {
          alreadyCurrent += 1; // nothing to repair
        } else {
          missing += 1;
          console.log(`${after.slug}: neither title found — "${oldTitle}"`);
        }
        continue;
      }

      if (duplicate) {
        // Created by the post-conversion seed run; it can carry no history,
        // because nothing could have been answered in between.
        const attempts = await prisma.questionAttempt.count({
          where: { questionId: duplicate.id },
        });
        if (attempts > 0) {
          console.log(
            `${after.slug}: duplicate for "${newTitle}" has ${attempts} attempts — left alone`,
          );
          continue;
        }
        if (WRITE) {
          await prisma.answerOption.deleteMany({
            where: { questionId: duplicate.id },
          });
          await prisma.question.delete({ where: { id: duplicate.id } });
        }
        removed += 1;
      }

      if (WRITE) {
        await prisma.question.update({
          where: { id: original.id },
          data: { title: newTitle },
        });
      }
      renamed += 1;
    }
  }

  console.log(
    `renamed: ${renamed}  duplicates removed: ${removed}  ` +
      `already current: ${alreadyCurrent}  not found: ${missing}  ` +
      `(${WRITE ? 'written' : 'dry run'})`,
  );
  await prisma.$disconnect();
}

void main();
