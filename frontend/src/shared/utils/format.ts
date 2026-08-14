/**
 * Small, dependency-free formatting helpers shared across features. The
 * backend returns accuracy/score as pre-formatted strings and study time in
 * seconds; these normalize them for display without altering the values.
 *
 * Every helper here names `uk-UA` explicitly rather than letting `Intl` pick
 * up the browser's locale. The interface is Ukrainian for everyone, so a
 * reader whose browser is set to English would otherwise see "2,430" and
 * "Jul 20, 2026" sitting inside Ukrainian sentences — and the developer,
 * whose browser is likely set the same way, would never see it go wrong.
 */

/** The interface locale — see the note above; never the browser's. */
const LOCALE = 'uk-UA';

/** Formats an integer with locale grouping (e.g. 2430 → "2 430"). */
export function formatNumber(value: number): string {
  return value.toLocaleString(LOCALE);
}

/**
 * Renders a percentage the backend already computed. Accepts a number or the
 * string form it returns, and appends a single `%` only when missing — never
 * double-formats.
 */
export function formatPercent(value: string | number): string {
  const text = String(value).trim();
  if (text === '') {
    return '0%';
  }
  return text.endsWith('%') ? text : `${text}%`;
}

/**
 * Humanizes a duration in seconds: "0 хв", "45 с", "12 хв", "1 год 23 хв".
 * Study time is coarse, so seconds are only shown under a minute.
 *
 * The unit abbreviations are the Ukrainian ones and take no full stop. They
 * are invariant, so no plural agreement is needed — unlike a spelled-out unit,
 * which would need `pluralUk`.
 */
export function formatDuration(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) {
    return '0 хв';
  }
  const seconds = Math.floor(totalSeconds);
  if (seconds < 60) {
    return `${seconds} с`;
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes} хв`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours} год ${remainingMinutes} хв` : `${hours} год`;
}

/**
 * Picks the Ukrainian plural form for a count: 1 тема, 2 теми, 5 тем.
 *
 * Ukrainian has three forms rather than English's two, so a count cannot be
 * rendered by appending an "s". The form follows the last digit, except in the
 * teens (11–14), which always take the `many` form despite ending in 1–4.
 */
export function pluralUk(count: number, one: string, few: string, many: string): string {
  const lastDigit = count % 10;
  const lastTwoDigits = count % 100;

  if (lastDigit === 1 && lastTwoDigits !== 11) {
    return one;
  }
  if (lastDigit >= 2 && lastDigit <= 4 && (lastTwoDigits < 12 || lastTwoDigits > 14)) {
    return few;
  }
  return many;
}

/** Short absolute date (e.g. "20 лип. 2026 р."); echoes the input if unparseable. */
export function formatShortDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleDateString(LOCALE, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
