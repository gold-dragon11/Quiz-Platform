import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  MAX_CONTENT_LENGTH,
  findContentViolation,
} from '../../src/learning-materials/learning-material.constants';

const CONTENT_ROOT = join(__dirname, 'content');

/**
 * Authoring format for learning materials.
 *
 * Materials are prose, so they live as one Markdown file per topic rather
 * than inside the JSON question packs — escaping paragraphs into a JSON
 * string makes them unreadable in the very editor they are written in. The
 * filename is the slug, which is also the topic slug it attaches to.
 *
 *   prisma/seed/content/<subject>/materials/<topic-slug>.md
 *
 * Each file opens with a small header block delimited by `---` lines,
 * followed by the body:
 *
 *   ---
 *   title: Квадратична функція
 *   description: Парабола, вершина, нулі та знак старшого коефіцієнта.
 *   ---
 *
 *   ## Означення
 *   …
 *
 * Reading time is not authored — the service derives it from the body, so it
 * cannot drift from the text.
 */
export interface MaterialContent {
  /** Slug of both the file and the topic it belongs to. */
  slug: string;
  title: string;
  description?: string;
  /** Markdown body, with LaTeX between `$…$` and `$$…$$`. */
  content: string;
}

const HEADER_DELIMITER = '---';

/**
 * Splits the header block from the body. Deliberately strict about the
 * opening delimiter: a file that merely starts with a horizontal rule is a
 * malformed header, not a material without one, and silently treating it as
 * a body would seed a material with no title.
 */
function parseFile(slug: string, raw: string): MaterialContent {
  // The BOM is written as an escape: as a literal character it is
  // invisible in the source and ESLint rejects it (no-irregular-whitespace).
  const text = raw.replace(/^\uFEFF/, '').trimStart();
  const lines = text.split('\n');

  if (lines[0]?.trim() !== HEADER_DELIMITER) {
    throw new Error(`${slug}.md: missing the opening "---" header line`);
  }

  const closing = lines.indexOf(HEADER_DELIMITER, 1);
  if (closing === -1) {
    throw new Error(`${slug}.md: header block is not closed with "---"`);
  }

  const header: Record<string, string> = {};
  for (const line of lines.slice(1, closing)) {
    if (!line.trim()) {
      continue;
    }
    const separator = line.indexOf(':');
    if (separator === -1) {
      throw new Error(
        `${slug}.md: header line is not "key: value" — "${line}"`,
      );
    }
    header[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
  }

  if (!header.title) {
    throw new Error(`${slug}.md: header has no title`);
  }

  const content = lines
    .slice(closing + 1)
    .join('\n')
    .trim();
  if (!content) {
    throw new Error(`${slug}.md: body is empty`);
  }

  if (content.length > MAX_CONTENT_LENGTH) {
    throw new Error(
      `${slug}.md: body is ${content.length} characters, the limit is ${MAX_CONTENT_LENGTH}`,
    );
  }

  const violation = findContentViolation(content);
  if (violation) {
    throw new Error(`${slug}.md: ${violation}`);
  }

  return {
    slug,
    title: header.title,
    description: header.description || undefined,
    content,
  };
}

/**
 * Reads every material of one subject, in filename order. A subject with no
 * `materials/` directory simply has none — materials are written topic by
 * topic, so most subjects are partially covered for a long time.
 */
export function loadMaterials(subjectDir: string): MaterialContent[] {
  const dir = join(CONTENT_ROOT, subjectDir, 'materials');
  if (!existsSync(dir)) {
    return [];
  }

  return readdirSync(dir)
    .filter((file) => file.endsWith('.md'))
    .sort()
    .map((file) =>
      parseFile(
        file.replace(/\.md$/, ''),
        readFileSync(join(dir, file), 'utf8'),
      ),
    );
}
