/**
 * The same text with every formula flattened to readable plain text.
 *
 * Needed where markup cannot go — a native `<select>` option label, an
 * `aria-label`, a document title. Not a LaTeX-to-Unicode translator: it
 * removes the delimiters and the few commands our content uses as separators,
 * leaving something a reader can still follow.
 */
export function mathToPlainText(text: string): string {
  return text
    .replaceAll('$', '')
    .replace(/\\cdot/g, '·')
    .replace(/\\ne/g, '≠')
    .replace(/\\le/g, '≤')
    .replace(/\\ge/g, '≥')
    .replace(/\\pm/g, '±')
    .replace(/\\infty/g, '∞')
    .replace(/\\left|\\right/g, '')
    .replace(/\\[a-zA-Z]+/g, (command) => command.slice(1))
    .replace(/[{}]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
