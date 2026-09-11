import {
  clusterByPassage,
  drawKeepingPassages,
  type PassageMember,
} from './passage-draw.util';

const lone = (id: string): PassageMember => ({
  id,
  passageId: null,
  passageOrder: null,
});

const of = (passageId: string, order: number, id = `${passageId}${order}`) => ({
  id,
  passageId,
  passageOrder: order,
});

describe('drawKeepingPassages', () => {
  it('takes a passage whole, in its own order, where its first question was preferred', () => {
    const candidates = [
      lone('a'),
      of('p', 3),
      lone('b'),
      of('p', 1),
      of('p', 2),
    ];

    expect(drawKeepingPassages(candidates, 5)).toEqual([
      'a',
      'p1',
      'p2',
      'p3',
      'b',
    ]);
  });

  it('skips a passage that does not fit and fills the session with what does', () => {
    const candidates = [
      lone('a'),
      of('p', 1),
      of('p', 2),
      of('p', 3),
      lone('b'),
    ];

    expect(drawKeepingPassages(candidates, 3)).toEqual(['a', 'b', 'p1']);
  });

  it('cuts the next passage when only passages are left', () => {
    const candidates = [
      of('p', 1),
      of('p', 2),
      of('p', 3),
      of('q', 1),
      of('q', 2),
      of('q', 3),
    ];

    expect(drawKeepingPassages(candidates, 4)).toEqual([
      'p1',
      'p2',
      'p3',
      'q1',
    ]);
  });

  it('returns fewer than asked when the pool is smaller, so the caller can refuse', () => {
    expect(drawKeepingPassages([lone('a'), of('p', 1)], 3)).toEqual([
      'a',
      'p1',
    ]);
  });

  it('never returns a question twice', () => {
    const candidates = [of('p', 1), of('p', 2), lone('a'), of('q', 1)];
    const ids = drawKeepingPassages(candidates, 4);

    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toHaveLength(4);
  });
});

describe('clusterByPassage', () => {
  it('pulls scattered questions of a passage together at the first one', () => {
    const members = [of('p', 2), lone('a'), of('p', 1), lone('b')];

    expect(clusterByPassage(members)).toEqual(['p1', 'p2', 'a', 'b']);
  });

  it('leaves a list without passages exactly as it was', () => {
    const members = [lone('c'), lone('a'), lone('b')];

    expect(clusterByPassage(members)).toEqual(['c', 'a', 'b']);
  });
});
