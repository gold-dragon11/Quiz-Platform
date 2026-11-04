/**
 * Kyiv wall-clock time, wherever the server runs. The learners, the exam and
 * every schedule the product promises are in Kyiv.
 */
const ZONE = 'Europe/Kyiv';

/** «2026-11-01», the Kyiv date of `now`. */
export function kyivDate(now: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: ZONE }).format(now);
}

/** 0–23 in Kyiv. */
export function kyivHour(now: Date): number {
  return Number(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: ZONE,
      hour: '2-digit',
      hourCycle: 'h23',
    }).format(now),
  );
}

/**
 * The instant Kyiv's clocks show 00:00 on `date` («2027-05-14»). Read off the
 * Kyiv hour at UTC midnight, which is two or three hours ahead: a summer-time
 * switch happens at 03:00 local, so it never falls between the two.
 */
export function kyivMidnight(date: string): Date {
  const utcMidnight = new Date(`${date}T00:00:00Z`);
  return new Date(utcMidnight.getTime() - kyivHour(utcMidnight) * 3_600_000);
}
