import { QuestionType } from '@prisma/client';
import { dealOptions } from './option-deal.util';

const SECRET = 'a-server-secret-of-at-least-thirty-two-chars';

const options = (count: number) =>
  Array.from({ length: count }, (_, order) => ({ id: `o${order}`, order }));

describe('dealOptions', () => {
  it('returns an ORDERING list in the dealt sequence, order rewritten to position', () => {
    const result = dealOptions(
      QuestionType.ORDERING,
      options(4),
      's:q',
      0,
      SECRET,
    );

    expect(result.map((option) => option.order)).toEqual([0, 1, 2, 3]);
    expect(new Set(result.map((option) => option.id))).toEqual(
      new Set(['o0', 'o1', 'o2', 'o3']),
    );
  });

  it('does not leave the stored sequence in the array — the key the client used to read off', () => {
    // Over many sittings the stored-first item lands first about one time in
    // four, and the whole stored sequence about one time in 24.
    let firstInPlace = 0;
    let wholeInPlace = 0;
    const sittings = 400;
    for (let sitting = 0; sitting < sittings; sitting += 1) {
      const ids = dealOptions(
        QuestionType.ORDERING,
        options(4),
        `session-${sitting}:question`,
        0,
        SECRET,
      ).map((option) => option.id);
      if (ids[0] === 'o0') firstInPlace += 1;
      if (ids.join() === 'o0,o1,o2,o3') wholeInPlace += 1;
    }
    expect(firstInPlace / sittings).toBeGreaterThan(0.15);
    expect(firstInPlace / sittings).toBeLessThan(0.35);
    expect(wholeInPlace / sittings).toBeLessThan(0.1);
  });

  it('deals the same layout for the same session and secret, so resume and review match', () => {
    const first = dealOptions(
      QuestionType.ORDERING,
      options(4),
      's:q',
      0,
      SECRET,
    );
    const again = dealOptions(
      QuestionType.ORDERING,
      options(4),
      's:q',
      0,
      SECRET,
    );
    expect(again).toEqual(first);
  });

  it('cannot be replayed from the seed key alone: another secret deals differently', () => {
    const layouts = new Set<string>();
    for (let n = 0; n < 20; n += 1) {
      layouts.add(
        dealOptions(
          QuestionType.ORDERING,
          options(7),
          's:q',
          0,
          `${SECRET}-${n}`,
        )
          .map((option) => option.id)
          .join(),
      );
    }
    expect(layouts.size).toBeGreaterThan(10);
  });

  it('keeps MATCHING prompts first and in place, dealing only the choices', () => {
    let firstChoiceInPlace = 0;
    const sittings = 400;
    for (let sitting = 0; sitting < sittings; sitting += 1) {
      const result = dealOptions(
        QuestionType.MATCHING,
        options(9),
        `session-${sitting}:question`,
        4,
        SECRET,
      );
      expect(result.slice(0, 4).map((option) => option.id)).toEqual([
        'o0',
        'o1',
        'o2',
        'o3',
      ]);
      expect(result.map((option) => option.order)).toEqual([
        0, 1, 2, 3, 4, 5, 6, 7, 8,
      ]);
      expect(new Set(result.slice(4).map((option) => option.id))).toEqual(
        new Set(['o4', 'o5', 'o6', 'o7', 'o8']),
      );
      if (result[4].id === 'o4') firstChoiceInPlace += 1;
    }
    expect(firstChoiceInPlace / sittings).toBeLessThan(0.35);
  });

  it('leaves single choice untouched — it is shuffled when the bank is seeded', () => {
    const list = options(4);
    expect(
      dealOptions(QuestionType.SINGLE_CHOICE, list, 's:q', 0, SECRET),
    ).toBe(list);
  });

  it('refuses to deal without a secret rather than dealing a replayable layout', () => {
    expect(() =>
      dealOptions(QuestionType.ORDERING, options(4), 's:q', 0, ''),
    ).toThrow();
  });
});
