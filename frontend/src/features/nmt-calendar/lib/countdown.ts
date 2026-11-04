import { pluralUk } from '@/shared/utils/format';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/**
 * «143 дні 6 годин», «6 годин», «менше години»; null once the moment has
 * come. Days and hours only: a ticking seconds counter is the look of a sale
 * banner, and the exam is months away, not seconds.
 */
export function countdownText(startsAt: string, now: number): string | null {
  const left = new Date(startsAt).getTime() - now;
  if (!(left > 0)) {
    return null;
  }
  const days = Math.floor(left / DAY);
  const hours = Math.floor((left % DAY) / HOUR);
  const dayPart = days > 0 ? `${days} ${pluralUk(days, 'день', 'дні', 'днів')}` : '';
  const hourPart = hours > 0 ? `${hours} ${pluralUk(hours, 'година', 'години', 'годин')}` : '';
  return [dayPart, hourPart].filter(Boolean).join(' ') || 'менше години';
}
