import { pickPassageBlock, type PassageBlockCandidate } from './passage-block';

const member = (
  id: string,
  passageId: string,
  nmtTask: number,
  lastSeen: Date | null = null,
  passageOrder: number | null = nmtTask,
): PassageBlockCandidate => ({
  id,
  passageId,
  passageOrder,
  nmtTask,
  lastSeen,
});

const full = (passageId: string, lastSeen: Date | null = null) =>
  [21, 22, 23].map((n) => member(`${passageId}-${n}`, passageId, n, lastSeen));

describe('pickPassageBlock', () => {
  it('takes every number from one text, in the paper’s order', () => {
    const shuffled = [...full('a')].reverse();

    expect(pickPassageBlock(shuffled, [21, 22, 23])).toEqual([
      'a-21',
      'a-22',
      'a-23',
    ]);
  });

  it('never stitches a run together from two texts', () => {
    const candidates = [
      member('a-21', 'a', 21),
      member('a-22', 'a', 22),
      member('b-23', 'b', 23),
    ];

    expect(pickPassageBlock(candidates, [21, 22, 23])).toBeNull();
  });

  it('prefers a text never met, then the one met longest ago', () => {
    const recent = full('recent', new Date('2026-09-10'));
    const older = full('older', new Date('2026-08-01'));
    const fresh = full('fresh');

    expect(
      pickPassageBlock([...recent, ...older, ...fresh], [21, 22, 23]),
    ).toEqual(['fresh-21', 'fresh-22', 'fresh-23']);
    expect(pickPassageBlock([...recent, ...older], [21, 22, 23])?.[0]).toBe(
      'older-21',
    );
  });

  it('counts a text as seen when any one of its questions was', () => {
    const partlySeen = [
      member('a-21', 'a', 21),
      member('a-22', 'a', 22, new Date('2026-09-10')),
      member('a-23', 'a', 23),
    ];
    const seenLongAgo = full('b', new Date('2026-06-01'));

    expect(
      pickPassageBlock([...partlySeen, ...seenLongAgo], [21, 22, 23])?.[0],
    ).toBe('b-21');
  });

  it('keeps the earlier question when a text has two for one number', () => {
    const candidates = [
      ...full('a'),
      member('a-21-later', 'a', 21, null, 99),
    ].reverse();

    expect(pickPassageBlock(candidates, [21, 22, 23])?.[0]).toBe('a-21');
  });
});
