import { describe, expect, it } from 'vitest';
import {
  formatCount,
  fractionalIndex,
  howStep,
  LADDER_FRAMES,
  LADDER_WRONG_AT,
  ladderStage,
  plural,
  rungAt,
  sheetPose,
  timelineAt,
} from './scene-math';

/**
 * The scenes are pictures of rules the product keeps, so the arithmetic is
 * held to those rules rather than to particular pixel values.
 */
describe('the mistake ladder', () => {
  it('starts on the first rung and climbs one rung per right answer', () => {
    expect(rungAt(0.1)).toMatchObject({ from: 0, to: 0 });
    expect(rungAt(0.4)).toMatchObject({ from: 1, to: 1 });
    expect(rungAt(0.65)).toMatchObject({ from: 2, to: 2 });
  });

  it('sends the question back to the first rung after a new mistake', () => {
    expect(rungAt(1)).toMatchObject({ to: 0 });
    expect(ladderStage(1)).toBe(3);
  });

  it('marks the card wrong only once the climb is over', () => {
    const lastClimbFrame = LADDER_FRAMES[2];
    expect(lastClimbFrame).toBeLessThan(LADDER_WRONG_AT);
    expect(ladderStage(lastClimbFrame)).toBe(2);
  });

  it('puts every stage of the list on its own frame', () => {
    expect(LADDER_FRAMES.map(ladderStage)).toEqual([0, 1, 2, 3]);
  });
});

describe('how it works', () => {
  it('names the step being read', () => {
    expect([0.04, 0.5, 0.96].map(howStep)).toEqual([1, 2, 3]);
  });

  it('keeps the sheet being read in front and solid', () => {
    const pose = sheetPose(1, 1);
    expect(pose.opacity).toBe(1);
    expect(pose.filter).toBe('');
    expect(pose.zIndex).toBeGreaterThan(sheetPose(2, 1).zIndex);
  });

  it('never lets a waiting sheet show through the one in front', () => {
    expect(sheetPose(2, 0).opacity).toBe(1);
    expect(sheetPose(2, 0).filter).toMatch(/brightness/);
  });

  it('holds a sheet through the first half of its step', () => {
    expect(sheetPose(0, 0.4)).toEqual(sheetPose(0, 0));
  });
});

describe('a list driving a scene', () => {
  const tops = [100, 200, 300];

  it('reads the item at the line, with how far it is towards the next', () => {
    expect(fractionalIndex(100, tops)).toBe(0);
    expect(fractionalIndex(150, tops)).toBe(0.5);
    expect(fractionalIndex(300, tops)).toBe(2);
  });

  it('stays at the ends before the list arrives and after it has gone', () => {
    expect(fractionalIndex(0, tops)).toBe(0);
    expect(fractionalIndex(900, tops)).toBe(2);
    expect(fractionalIndex(50, [])).toBe(0);
  });

  it('maps whole items onto their frames', () => {
    expect(timelineAt(0, LADDER_FRAMES)).toBe(LADDER_FRAMES[0]);
    expect(timelineAt(3, LADDER_FRAMES)).toBe(LADDER_FRAMES[3]);
  });
});

describe('words', () => {
  it('agrees the noun with the number', () => {
    const balu = ['бал', 'бали', 'балів'] as const;
    expect([1, 3, 5, 11, 21, 22, 112].map((n) => plural(n, balu))).toEqual([
      'бал',
      'бали',
      'балів',
      'балів',
      'бал',
      'бали',
      'балів',
    ]);
  });

  it('never lets a grouped number break across lines', () => {
    expect(formatCount(5399)).toBe('5\u00A0399');
    expect(formatCount(76)).toBe('76');
  });
});
