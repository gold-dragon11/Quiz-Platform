import { Difficulty } from '@prisma/client';
import { isMatching, type QuestionContent, type TopicContent } from './types';

/**
 * Content validation mirroring the rules the Admin API enforces
 * (docs/02-domain/question.md §7, docs/02-domain/answer-option.md §9), so
 * seeded content can never be something an administrator could not have
 * created through the API.
 *
 * Fails loudly with every problem at once — a partial seed of invalid content
 * is worse than no seed.
 */

const MAX_TITLE_LENGTH = 2000;
const MAX_EXPLANATION_LENGTH = 2000;
const MAX_OPTION_LENGTH = 500;
const MIN_OPTIONS = 2;
const MAX_OPTIONS = 20;

/**
 * Inline formulas are written between `$…$` and rendered with KaTeX
 * (docs/02-domain/question.md §8). These checks catch the ways a formula gets
 * broken while editing content by hand: a delimiter left unclosed, a formula
 * cut in the middle of an expression, or brackets that do not match. They
 * cannot judge whether the mathematics is right — only that what is there can
 * be typeset.
 */
function validateFormulas(text: string, at: string, field: string): string[] {
  const errors: string[] = [];
  const delimiters = (text.match(/\$/g) ?? []).length;
  if (delimiters % 2 !== 0) {
    errors.push(`${at}: ${field} has an unclosed "$" formula delimiter`);
    return errors;
  }

  for (const [, body] of text.matchAll(/\$([^$]*)\$/g)) {
    const formula = body.trim();
    if (!formula) {
      errors.push(`${at}: ${field} has an empty formula`);
      continue;
    }
    if (/[+\-=<>*/,;·:]$/.test(formula)) {
      errors.push(
        `${at}: ${field} has a formula ending on an operator: ${formula}`,
      );
    }
    let depth = 0;
    for (const character of formula) {
      if (character === '(' || character === '[') {
        depth += 1;
      } else if (character === ')' || character === ']') {
        depth -= 1;
        if (depth < 0) {
          break;
        }
      }
    }
    if (depth !== 0) {
      errors.push(`${at}: ${field} has unbalanced brackets: ${formula}`);
    }
    const open = (formula.match(/{/g) ?? []).length;
    const close = (formula.match(/}/g) ?? []).length;
    if (open !== close) {
      errors.push(`${at}: ${field} has unbalanced braces: ${formula}`);
    }
  }

  return errors;
}

export function validateTopic(topic: TopicContent): string[] {
  const errors: string[] = [];
  const where = (index: number): string => `${topic.slug}[${index}]`;

  if (!topic.slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(topic.slug)) {
    errors.push(`${topic.slug}: slug must be lowercase kebab-case`);
  }
  if (!topic.name?.trim()) {
    errors.push(`${topic.slug}: name is required`);
  }
  if (topic.questions.length === 0) {
    errors.push(`${topic.slug}: has no questions`);
  }

  const seenTitles = new Set<string>();

  topic.questions.forEach((question, index) => {
    const at = where(index);

    if (!question.title?.trim()) {
      errors.push(`${at}: title is required`);
    } else if (question.title.length > MAX_TITLE_LENGTH) {
      errors.push(`${at}: title exceeds ${MAX_TITLE_LENGTH} characters`);
    } else {
      errors.push(...validateFormulas(question.title, at, 'title'));
    }

    // Duplicate wording is the most common quality failure in generated
    // content, so it is treated as an error rather than a warning.
    const normalized = question.title?.trim().toLowerCase();
    if (normalized) {
      if (seenTitles.has(normalized)) {
        errors.push(`${at}: duplicate question title within topic`);
      }
      seenTitles.add(normalized);
    }

    if (!(question.difficulty in Difficulty)) {
      errors.push(`${at}: unknown difficulty "${question.difficulty}"`);
    }

    // Mirrors the Admin API's own limit, so seeded content can never be
    // something an administrator could not have typed into the form.
    if (question.explanation !== undefined) {
      if (!question.explanation.trim()) {
        errors.push(`${at}: explanation is present but empty`);
      } else if (question.explanation.length > MAX_EXPLANATION_LENGTH) {
        errors.push(
          `${at}: explanation exceeds ${MAX_EXPLANATION_LENGTH} characters`,
        );
      } else {
        errors.push(
          ...validateFormulas(question.explanation, at, 'explanation'),
        );
      }
    }

    errors.push(...validateAnswers(question, at));
  });

  return errors;
}

function validateAnswers(question: QuestionContent, at: string): string[] {
  const errors: string[] = [];

  if (isMatching(question)) {
    const { pairs } = question;
    if (!Array.isArray(pairs) || pairs.length < 2) {
      errors.push(`${at}: matching needs at least 2 pairs`);
      return errors;
    }
    if (pairs.length * 2 > MAX_OPTIONS) {
      errors.push(`${at}: matching exceeds ${MAX_OPTIONS} options`);
    }

    const lefts = new Set<string>();
    const rights = new Set<string>();
    pairs.forEach(([left, right], i) => {
      if (!left?.trim() || !right?.trim()) {
        errors.push(`${at}: pair ${i} has an empty side`);
        return;
      }
      errors.push(...validateFormulas(left, at, `pair ${i} left`));
      errors.push(...validateFormulas(right, at, `pair ${i} right`));
      if (left.length > MAX_OPTION_LENGTH || right.length > MAX_OPTION_LENGTH) {
        errors.push(`${at}: pair ${i} exceeds ${MAX_OPTION_LENGTH} characters`);
      }
      if (left === right) {
        errors.push(`${at}: pair ${i} matches itself`);
      }
      if (lefts.has(left)) {
        errors.push(`${at}: duplicate left item "${left}"`);
      }
      if (rights.has(right)) {
        errors.push(`${at}: duplicate right item "${right}"`);
      }
      lefts.add(left);
      rights.add(right);
    });

    // A value appearing on both sides makes the intended pairing ambiguous.
    for (const left of lefts) {
      if (rights.has(left)) {
        errors.push(`${at}: "${left}" appears on both sides`);
      }
    }
    return errors;
  }

  const { options, correct } = question;
  if (!Array.isArray(options) || options.length < MIN_OPTIONS) {
    errors.push(`${at}: needs at least ${MIN_OPTIONS} options`);
    return errors;
  }
  if (options.length > MAX_OPTIONS) {
    errors.push(`${at}: exceeds ${MAX_OPTIONS} options`);
  }
  options.forEach((option, i) => {
    if (!option?.trim()) {
      errors.push(`${at}: option ${i} is empty`);
    } else if (option.length > MAX_OPTION_LENGTH) {
      errors.push(`${at}: option ${i} exceeds ${MAX_OPTION_LENGTH} characters`);
    } else {
      errors.push(...validateFormulas(option, at, `option ${i}`));
    }
  });

  const unique = new Set(options.map((o) => o.trim()));
  if (unique.size !== options.length) {
    errors.push(`${at}: duplicate answer options`);
  }

  if (!Number.isInteger(correct) || correct < 0 || correct >= options.length) {
    errors.push(`${at}: "correct" must index into options`);
  }

  return errors;
}
