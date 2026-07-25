/**
 * Small, dependency-free formatting helpers shared across features. The
 * backend returns accuracy/score as pre-formatted strings and study time in
 * seconds; these normalize them for display without altering the values.
 */

/** Formats an integer with locale grouping (e.g. 2430 → "2,430"). */
export function formatNumber(value: number): string {
  return value.toLocaleString();
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
 * Humanizes a duration in seconds: "0m", "45s", "12m", "1h 23m". Study time is
 * coarse, so seconds are only shown under a minute.
 */
export function formatDuration(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) {
    return '0m';
  }
  const seconds = Math.floor(totalSeconds);
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

/** Short absolute date (e.g. "Jul 20, 2026"); echoes the input if unparseable. */
export function formatShortDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
