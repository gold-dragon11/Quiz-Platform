import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { SubjectContent, TopicContent } from './types';
import { validateTopic } from './validate';

const CONTENT_ROOT = join(__dirname, 'content');

export interface LoadedSubject {
  subject: SubjectContent;
  topics: TopicContent[];
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

/**
 * Reads a subject manifest and every topic it lists, validating as it goes.
 * Throws with the complete list of problems rather than seeding partial or
 * malformed content.
 */
export function loadSubject(subjectDir: string): LoadedSubject {
  const root = join(CONTENT_ROOT, subjectDir);
  const subject = readJson<SubjectContent>(join(root, 'subject.json'));

  const topics = subject.topics.map((slug) =>
    readJson<TopicContent>(join(root, 'topics', `${slug}.json`)),
  );

  const errors = topics.flatMap((topic) => validateTopic(topic));

  const slugs = new Set<string>();
  for (const topic of topics) {
    if (slugs.has(topic.slug)) {
      errors.push(`duplicate topic slug "${topic.slug}"`);
    }
    slugs.add(topic.slug);
  }

  if (errors.length > 0) {
    throw new Error(
      `Invalid content in "${subjectDir}":\n  - ${errors.join('\n  - ')}`,
    );
  }

  return { subject, topics };
}
