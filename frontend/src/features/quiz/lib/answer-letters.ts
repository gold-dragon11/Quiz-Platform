/**
 * The letters printed beside the answer options.
 *
 * Every Ukrainian paper labels its options А, Б, В… — the Ukrainian alphabet
 * with И, Й, Ї and Ь left out, because they are too easy to confuse at a
 * glance. The English paper labels them A, B, C…, and says so in the
 * instruction above the task: «Match choices (A–H) to (1–5)». Printing А–Ж
 * under that sentence would contradict the paper the screen is imitating.
 */
const UKRAINIAN = ['А', 'Б', 'В', 'Г', 'Д', 'Е', 'Є', 'Ж', 'З'];
const LATIN = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];

/** Subjects whose questions are written in English, and lettered that way. */
const LATIN_SUBJECTS = new Set(['english-language']);

export function lettersFor(subjectSlug: string | undefined): string[] {
  return subjectSlug !== undefined && LATIN_SUBJECTS.has(subjectSlug) ? LATIN : UKRAINIAN;
}
