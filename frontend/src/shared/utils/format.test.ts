import { describe, expect, it } from 'vitest';
import { formatDuration, formatNumber, formatPercent, pluralUk } from './format';

/**
 * Plural agreement is not a detail here: these helpers label every figure on
 * the product, and «1 291 запитань» shipped to production because nothing
 * checked the one case Ukrainian gets wrong.
 */
describe('pluralUk', () => {
  it('uses the singular for numbers ending in one, except the teens', () => {
    expect(pluralUk(1, 'запитання', 'запитання', 'запитань')).toBe('запитання');
    expect(pluralUk(1291, 'запитання', 'запитання', 'запитань')).toBe('запитання');
    expect(pluralUk(11, 'запитання', 'запитання', 'запитань')).toBe('запитань');
    expect(pluralUk(111, 'запитання', 'запитання', 'запитань')).toBe('запитань');
  });

  it('uses the few form for two to four', () => {
    for (const n of [2, 3, 4, 22, 1364]) {
      expect(pluralUk(n, 'тест', 'тести', 'тестів')).toBe('тести');
    }
    for (const n of [12, 13, 14]) {
      expect(pluralUk(n, 'тест', 'тести', 'тестів')).toBe('тестів');
    }
  });

  it('uses the many form for the rest, zero included', () => {
    for (const n of [0, 5, 9, 25, 1566]) {
      expect(pluralUk(n, 'бал', 'бали', 'балів')).toBe('балів');
    }
  });
});

describe('formatPercent', () => {
  it('drops a trailing .00 and rounds the rest', () => {
    expect(formatPercent('80.00')).toBe('80%');
    expect(formatPercent('16.67')).toBe('17%');
    expect(formatPercent(0)).toBe('0%');
  });

  it('answers 0% rather than NaN for an empty value', () => {
    expect(formatPercent('')).toBe('0%');
  });
});

describe('formatDuration', () => {
  it('never shows a negative or empty duration', () => {
    expect(formatDuration(0)).toBe('0 хв');
    expect(formatDuration(-10)).toBe('0 хв');
  });
});

describe('formatNumber', () => {
  it('groups thousands the Ukrainian way', () => {
    // A narrow no-break space, not an ordinary one.
    expect(formatNumber(5399).replace(/[\u00a0\u202f]/g, ' ')).toBe('5 399');
  });
});
