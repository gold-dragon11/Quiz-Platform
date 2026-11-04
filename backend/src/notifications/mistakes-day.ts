/**
 * The Kyiv calendar for the mistakes email (decision 48): it goes out at four
 * in the afternoon where the learners are, whatever the server's clock says.
 */
export { kyivDate, kyivHour } from '../common/kyiv-time';

/** The earliest hour it is sent. */
export const SEND_FROM_HOUR = 16;
/**
 * The latest. The scheduler runs hourly and can be late, so there is a window,
 * not an instant; past it, a reminder about today reads like spam at night.
 */
export const SEND_UNTIL_HOUR = 21;

/**
 * The dispatch row's refId for a day. email_dispatches is unique on
 * (user, kind, refId) and refId is a uuid, so the day is written as one:
 * `00000000-0000-4000-8000-000020261101`. One row per learner per Kyiv day is
 * what makes a second run of the sweep send nothing.
 */
export function dayRefId(date: string): string {
  return `00000000-0000-4000-8000-0000${date.replace(/-/g, '')}`;
}
