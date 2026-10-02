import { buildDigest, type DigestCounts } from './digest-message';

/**
 * The digest's judgement, which is the part that can be wrong in a way nobody
 * notices for weeks: a morning message that says nothing trains its reader to
 * stop opening them, and a missing one is indistinguishable from a bot that
 * died.
 */

const counts = (over: Partial<DigestCounts> = {}): DigestCounts => ({
  newLearners: 0,
  newTeachers: 0,
  verified: 0,
  testsCompleted: 0,
  activePeople: 0,
  totalAccounts: 0,
  ...over,
});

describe('buildDigest', () => {
  describe('a quiet day', () => {
    it('says nothing at all', () => {
      expect(buildDigest('day', counts({ totalAccounts: 12 }))).toBeNull();
    });

    it('still speaks if somebody took a test without registering', () => {
      // A returning learner is exactly the thing worth hearing about.
      expect(
        buildDigest('day', counts({ testsCompleted: 3, activePeople: 1 })),
      ).toContain('Пройдено тестів: 3');
    });

    it('still speaks if somebody registered without taking a test', () => {
      expect(buildDigest('day', counts({ newLearners: 1 }))).toContain(
        'Нових акаунтів: 1',
      );
    });
  });

  describe('a quiet week', () => {
    it('reports anyway, so silence cannot be mistaken for a dead bot', () => {
      const message = buildDigest('week', counts({ totalAccounts: 12 }));

      expect(message).not.toBeNull();
      expect(message).toContain('За тиждень');
      expect(message).toContain('Нових акаунтів: 0');
      expect(message).toContain('Всього акаунтів: 12');
    });

    it('leaves out the verification line when nobody registered', () => {
      // «Підтвердили пошту: 0 з 0» is noise, and on a quiet week it would be
      // the only thing the summary said.
      expect(buildDigest('week', counts())).not.toContain('Підтвердили');
    });
  });

  describe('what it reports', () => {
    it('names the drop between registering and confirming', () => {
      const message = buildDigest(
        'day',
        counts({ newLearners: 5, verified: 2, totalAccounts: 40 }),
      );

      expect(message).toContain('Підтвердили пошту: 2 з 5');
      // The headline number of the whole funnel: a letter in a spam folder
      // looks exactly like somebody losing interest.
      expect(message).toContain('3 не дійшли до підтвердження');
    });

    it('is silent about the drop when everybody confirmed', () => {
      const message = buildDigest(
        'day',
        counts({ newLearners: 2, verified: 2 }),
      );

      expect(message).toContain('Підтвердили пошту: 2 з 2');
      expect(message).not.toContain('не дійш');
    });

    it('splits learners from teachers only when both arrived', () => {
      expect(
        buildDigest('day', counts({ newLearners: 3, newTeachers: 1 })),
      ).toContain('Нових акаунтів: 4 (учнів 3, вчителів 1)');
      expect(buildDigest('day', counts({ newLearners: 3 }))).toContain(
        'Нових акаунтів: 3\n',
      );
      expect(buildDigest('day', counts({ newTeachers: 2 }))).toContain(
        'Нових акаунтів: 2 (вчителі)',
      );
    });

    it.each([
      [1, '1 не дійшов'],
      [2, '2 не дійшли'],
      [5, '5 не дійшли'],
      [11, '11 не дійшли'],
      [21, '21 не дійшов'],
    ])(
      'counts %i in Ukrainian rather than as a template',
      (pending, expected) => {
        const message = buildDigest(
          'day',
          counts({ newLearners: pending + 1, verified: 1 }),
        );

        expect(message).toContain(expected);
      },
    );
  });
});
