/** Upper bound on a material's Markdown body (docs/02-domain/learning-material.md §6). */
export const MAX_CONTENT_LENGTH = 20000;

/**
 * Words read per minute, used to derive `estimatedReadingTime`. Deliberately
 * conservative: these are study notes with formulas and definitions, which
 * are read more slowly than prose.
 */
export const WORDS_PER_MINUTE = 150;

/**
 * Raw HTML inside the Markdown body.
 *
 * Content is stored as Markdown and rendered with raw HTML disabled, so a tag
 * would never execute — but it would also never appear, leaving an author
 * puzzled by silently missing text. Rejecting at write time makes the rule
 * visible instead, and keeps the stored content free of markup that a future
 * renderer might decide to trust.
 */
const HTML_TAG = /<\/?[a-z][^>]*>/i;

/**
 * URL schemes that execute rather than navigate. Markdown link syntax can
 * carry them (`[text](javascript:…)`), which the renderer would otherwise be
 * solely responsible for filtering.
 */
const DANGEROUS_URL_SCHEME = /\]\(\s*(?:javascript|data|vbscript):/i;

/** The specific problem found in a material body, or null when it is clean. */
export function findContentViolation(content: string): string | null {
  if (HTML_TAG.test(content)) {
    return 'HTML-теґи заборонені: використовуйте Markdown.';
  }
  if (DANGEROUS_URL_SCHEME.test(content)) {
    return 'Посилання можуть вести лише на http(s) або на внутрішні сторінки.';
  }
  return null;
}

/** Minutes to read, rounded up, never zero for a non-empty body. */
export function estimateReadingTime(content: string): number {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}
