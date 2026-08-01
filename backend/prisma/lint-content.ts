import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Authoring-quality linter for seed content (Phases 7.2–7.3).
 *
 * The seed validator enforces what the *database* requires; this catches
 * authoring slips that are structurally legal but wrong for learners:
 * stray keys, leftover editing notes, script mixing, duplicated examples,
 * malformed prose, and (for the English pack) inconsistent spelling variety.
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

/** Leftover editorial notes that must never reach a learner. */
const EDITORIAL =
  /(некоректн|правильна відповідь|беремо:|отже:|варіант\s*—|TODO|FIXME|\?\?)/i;
/** CJK or other scripts that have no business in this content. */
const FOREIGN_SCRIPT = /[一-鿿぀-ヿ؀-ۿ]/;
/** Cyrillic letters — a copy-paste hazard inside the English pack. */
const CYRILLIC = /[Ѐ-ӿ]/;
/** Typography borrowed from the Ukrainian packs, wrong in English prose. */
const NON_ENGLISH_PUNCTUATION = /[«»“”‘’]/;

/**
 * British spelling is the variety used by NMT/ZNO and Cambridge exams, so an
 * American form is a consistency error rather than a matter of taste.
 */
const AMERICAN_SPELLINGS: [RegExp, string][] = [
  [/\bcolor(s|ed|ing|ful)?\b/i, 'colour'],
  [/\bfavor(s|ed|ing|ite|ites)?\b/i, 'favour'],
  [/\bbehavior(s|al)?\b/i, 'behaviour'],
  [/\bneighbor(s|hood|ing)?\b/i, 'neighbour'],
  [/\blabor(s|ed|ing)?\b/i, 'labour'],
  [/\bhonor(s|ed|ing|able)?\b/i, 'honour'],
  [/\bhumor(s|ous)?\b/i, 'humour'],
  [/\bflavor(s|ed|ing)?\b/i, 'flavour'],
  [/\bcenter(s|ed|ing)?\b/i, 'centre'],
  [/\btheater(s)?\b/i, 'theatre'],
  [/\bmeter(s)?\b(?! reading)/i, 'metre'],
  [/\bliter(s)?\b/i, 'litre'],
  [/\brealiz(e|es|ed|ing|ation)\b/i, 'realise'],
  [/\borganiz(e|es|ed|ing|ation)\b/i, 'organise'],
  [/\brecogniz(e|es|ed|ing)\b/i, 'recognise'],
  [/\bapologiz(e|es|ed|ing)\b/i, 'apologise'],
  [/\bspecializ(e|es|ed|ing)\b/i, 'specialise'],
  [/\banalyz(e|es|ed|ing)\b/i, 'analyse'],
  [/\btravel(ed|ing|er|ers)\b/i, 'travelled / travelling / traveller'],
  [/\bcancel(ed|ing)\b/i, 'cancelled / cancelling'],
  [/\bmodel(ed|ing)\b/i, 'modelled / modelling'],
  [/\bdefense\b/i, 'defence'],
  [/\bpractis(e|ed|ing)\b(?=[^]*\bnoun\b)/i, 'practice (noun)'],
  [/\blicense\b(?! plate)/i, 'licence (noun)'],
  [/\bcatalog\b/i, 'catalogue'],
  [/\bdialog\b/i, 'dialogue'],
  [/\bprogram\b(?! of study)/i, 'programme'],
  [/\bgray\b/i, 'grey'],
  [/\bairplane(s)?\b/i, 'aeroplane'],
  [/\bfulfill(s)?\b/i, 'fulfil'],
  [/\bskillful\b/i, 'skilful'],
  [/\benrollment\b/i, 'enrolment'],
  [/\bvacation(s)?\b/i, 'holiday'],
  [/\bfall\b(?=\s+(?:semester|term))/i, 'autumn'],
];

/** Vowel-initial words that take "a", and consonant-initial words taking "an". */
const A_EXCEPTIONS =
  /^(?:one|once|uniform|unique|union|united|universit|usual|useful|user|European|euro|ubiquit)/i;
const AN_EXCEPTIONS = /^(?:hour|honest|honour|honorary|heir|MBA|MP|NHS)/i;

interface Question {
  title: string;
  type?: string;
  options?: string[];
  correct?: number;
  pairs?: [string, string][];
  [key: string]: unknown;
}

interface Report {
  errors: string[];
  warnings: string[];
}

/**
 * Reading tasks embed the passage in the question title, separated from the
 * stem by a blank line. Everything before that blank line is the passage.
 */
function passageOf(title: string): string | null {
  const split = title.lastIndexOf('\n\n');
  if (split === -1) return null;
  const passage = title.slice(0, split).trim();
  return passage.split(/\s+/).length >= 40 ? passage : null;
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

/** Prose checks that apply to any language. */
function lintProse(text: string, at: string, out: Report): void {
  if (EDITORIAL.test(text)) {
    out.errors.push(
      `${at}: editorial note left in text — "${text.slice(0, 60)}"`,
    );
  }
  if (FOREIGN_SCRIPT.test(text)) {
    out.errors.push(`${at}: foreign script in text — "${text.slice(0, 60)}"`);
  }
  if (/\s—\S|\S—\s/.test(text)) {
    out.errors.push(
      `${at}: em dash without surrounding spaces — "${text.slice(0, 60)}"`,
    );
  }
  if (/ {2,}/.test(text)) {
    out.errors.push(`${at}: double space — "${text.slice(0, 60)}"`);
  }
  if (/\n{3,}/.test(text)) {
    out.errors.push(`${at}: more than one blank line — "${text.slice(0, 60)}"`);
  }
  if (/^\s|\s$/.test(text)) {
    out.errors.push(
      `${at}: leading or trailing whitespace — "${text.slice(0, 60)}"`,
    );
  }
}

/** Checks specific to English prose. */
function lintEnglish(text: string, at: string, out: Report): void {
  if (CYRILLIC.test(text)) {
    out.errors.push(
      `${at}: Cyrillic letters in English text — "${text.slice(0, 60)}"`,
    );
  }
  if (NON_ENGLISH_PUNCTUATION.test(text)) {
    out.errors.push(
      `${at}: non-English quotation marks — "${text.slice(0, 60)}"`,
    );
  }
  for (const [pattern, british] of AMERICAN_SPELLINGS) {
    const hit = pattern.exec(text);
    if (hit) {
      out.errors.push(`${at}: American spelling "${hit[0]}" (use ${british})`);
    }
  }
  if (/\s[,.;:?!]/.test(text)) {
    out.errors.push(`${at}: space before punctuation — "${text.slice(0, 60)}"`);
  }
  if (/[,;](?=[A-Za-z])/.test(text)) {
    out.errors.push(
      `${at}: missing space after punctuation — "${text.slice(0, 60)}"`,
    );
  }
  const doubled = /\b([A-Za-z]{2,})\s+\1\b/i.exec(text);
  if (doubled && !/^(had|that|very)$/i.test(doubled[1])) {
    out.errors.push(
      `${at}: doubled word "${doubled[1]}" — "${text.slice(0, 60)}"`,
    );
  }
  const parens = text.split('(').length - text.split(')').length;
  if (parens !== 0) {
    out.errors.push(`${at}: unbalanced parentheses — "${text.slice(0, 60)}"`);
  }
  if ((text.split('"').length - 1) % 2 !== 0) {
    out.errors.push(`${at}: unbalanced double quotes — "${text.slice(0, 60)}"`);
  }

  for (const m of text.matchAll(/\ba ([A-Za-z]+)/g)) {
    if (/^[aeiou]/i.test(m[1]) && !A_EXCEPTIONS.test(m[1])) {
      out.errors.push(`${at}: "a ${m[1]}" should be "an ${m[1]}"`);
    }
  }
  for (const m of text.matchAll(/\ban ([A-Za-z]+)/g)) {
    if (!/^[aeiou]/i.test(m[1]) && !AN_EXCEPTIONS.test(m[1])) {
      out.errors.push(`${at}: "an ${m[1]}" should be "a ${m[1]}"`);
    }
  }
}

function lintPack(pack: string): Report {
  const out: Report = { errors: [], warnings: [] };
  const topicsDir = join(ROOT, pack, 'topics');
  if (!existsSync(topicsDir)) return out;

  const isEnglish = pack === 'english-language';

  // Cross-topic duplicate detection: the same question in two topics is a
  // quality failure the per-topic validator cannot see.
  const titlesAcrossPack = new Map<string, string>();
  // Reading passages must be unique; a repeated passage wastes a whole task.
  const passages = new Map<string, string>();
  // A headword used as the left side of many matching questions means the
  // pack is drilling the same vocabulary over and over.
  const matchingLefts = new Map<string, number>();

  for (const file of readdirSync(topicsDir).sort()) {
    const topic = JSON.parse(readFileSync(join(topicsDir, file), 'utf8')) as {
      slug: string;
      questions: Question[];
    };

    topic.questions.forEach((q, i) => {
      const at = `${pack}/${topic.slug}[${i}]`;

      for (const key of Object.keys(q)) {
        if (!ALLOWED_KEYS.has(key)) {
          out.errors.push(`${at}: unexpected key "${key}"`);
        }
      }

      const texts = [
        q.title,
        ...(q.options ?? []),
        ...(q.pairs ?? []).flat(),
      ].filter((t): t is string => typeof t === 'string');

      for (const text of texts) {
        lintProse(text, at, out);
        if (isEnglish) lintEnglish(text, at, out);
      }

      // Latin characters are legitimate in some packs (maths symbols, English
      // terms), so only flag them for the Ukrainian-language pack.
      if (pack === 'ukrainian-language') {
        for (const text of texts) {
          const latin = text.match(/[a-zA-Z]+/g);
          if (latin) {
            out.errors.push(
              `${at}: Latin letters "${latin.join(',')}" in "${text.slice(0, 50)}"`,
            );
          }
        }
      }

      const passage = passageOf(q.title);
      if (passage) {
        const words = countWords(passage);
        if (words < 100 || words > 200) {
          out.warnings.push(
            `${at}: passage is ${words} words (target 100–200)`,
          );
        }
        const owner = passages.get(passage);
        if (owner && owner !== topic.slug) {
          out.errors.push(`${at}: passage reused from topic "${owner}"`);
        }
        passages.set(passage, topic.slug);
      }

      for (const [left] of q.pairs ?? []) {
        const key = left.trim().toLowerCase();
        matchingLefts.set(key, (matchingLefts.get(key) ?? 0) + 1);
      }

      // Repeated stems across topics are legal (the seed keys on
      // topicId + title) but read as template wording, so they are a
      // quality warning rather than a hard failure.
      const key = q.title.trim().toLowerCase();
      const seenIn = titlesAcrossPack.get(key);
      if (seenIn && seenIn !== topic.slug) {
        out.warnings.push(`${at}: repeated stem, also in topic "${seenIn}"`);
      }
      titlesAcrossPack.set(key, topic.slug);
    });
  }

  for (const [left, count] of matchingLefts) {
    if (count > 2) {
      out.warnings.push(
        `${pack}: matching item "${left}" reused ${count} times`,
      );
    }
  }

  return out;
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
