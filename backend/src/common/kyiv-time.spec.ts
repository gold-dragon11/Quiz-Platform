import { kyivDate, kyivHour, kyivMidnight } from './kyiv-time';

describe('Kyiv time', () => {
  it('finds Kyiv midnight in summer and in winter', () => {
    expect(kyivMidnight('2027-05-14').toISOString()).toBe(
      '2027-05-13T21:00:00.000Z',
    ); // UTC+3
    expect(kyivMidnight('2027-01-14').toISOString()).toBe(
      '2027-01-13T22:00:00.000Z',
    ); // UTC+2
  });

  it('is right on the days the clocks change', () => {
    // Last Sundays of March and October 2027.
    expect(kyivMidnight('2027-03-28').toISOString()).toBe(
      '2027-03-27T22:00:00.000Z',
    );
    expect(kyivMidnight('2027-10-31').toISOString()).toBe(
      '2027-10-30T21:00:00.000Z',
    );
  });

  it('reads the Kyiv date and hour of an instant', () => {
    const instant = new Date('2027-05-13T21:30:00Z');
    expect(kyivDate(instant)).toBe('2027-05-14');
    expect(kyivHour(instant)).toBe(0);
  });
});
