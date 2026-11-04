import { describe, expect, it } from 'vitest';
import { countdownText } from './countdown';

const START = '2027-05-13T21:00:00.000Z';
const at = (iso: string) => new Date(iso).getTime();

describe('countdownText', () => {
  it('says days and hours, agreed with the number', () => {
    expect(countdownText(START, at('2026-11-04T12:00:00Z'))).toBe('190 днів 9 годин');
    expect(countdownText(START, at('2027-05-11T20:00:00Z'))).toBe('2 дні 1 година');
    expect(countdownText(START, at('2027-05-12T17:00:00Z'))).toBe('1 день 4 години');
  });

  it('drops a part that is zero', () => {
    expect(countdownText(START, at('2027-05-10T21:00:00Z'))).toBe('3 дні');
    expect(countdownText(START, at('2027-05-13T15:30:00Z'))).toBe('5 годин');
  });

  it('says «менше години» in the last hour and nothing once it has begun', () => {
    expect(countdownText(START, at('2027-05-13T20:30:00Z'))).toBe('менше години');
    expect(countdownText(START, at(START))).toBeNull();
    expect(countdownText(START, at('2027-05-20T00:00:00Z'))).toBeNull();
  });
});
