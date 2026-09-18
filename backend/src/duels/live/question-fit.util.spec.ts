import {
  estimateSeconds,
  fitsLiveTime,
  type TimedQuestion,
} from './question-fit.util';

const question = (overrides: Partial<TimedQuestion> = {}): TimedQuestion => ({
  type: 'SINGLE_CHOICE',
  difficulty: 'BEGINNER',
  subjectSlug: 'history-of-ukraine',
  textLength: 85,
  hasImage: false,
  inPassage: false,
  ...overrides,
});

describe('estimateSeconds', () => {
  it('is reading time plus the work the answer asks for', () => {
    // 85 characters at 17 a second, plus 3 s for a single choice.
    expect(estimateSeconds(question())).toBeCloseTo(8);
  });

  it('adds a calculation for mathematics outside numeric answers', () => {
    expect(
      estimateSeconds(question({ subjectSlug: 'mathematics' })),
    ).toBeCloseTo(16);
    expect(
      estimateSeconds(
        question({
          subjectSlug: 'mathematics',
          type: 'NUMERIC',
          textLength: 0,
        }),
      ),
    ).toBeCloseTo(20);
  });

  it('scales with difficulty, and treats an unmarked question as intermediate', () => {
    expect(estimateSeconds(question({ difficulty: 'ADVANCED' }))).toBeCloseTo(
      12,
    );
    expect(estimateSeconds(question({ difficulty: null }))).toBeCloseTo(9.6);
  });
});

describe('fitsLiveTime', () => {
  it('keeps a fifth of the time as margin', () => {
    // 8 s of work: fits 10 s (8 ≤ 8), not a budget that leaves no margin.
    expect(fitsLiveTime(question(), 10)).toBe(true);
    expect(fitsLiveTime(question({ textLength: 90 }), 10)).toBe(false);
  });

  it('never offers a question from a reading passage', () => {
    expect(fitsLiveTime(question({ inPassage: true, textLength: 0 }), 60)).toBe(
      false,
    );
  });

  it('offers a question with an image only from 20 seconds', () => {
    const pictured = question({ hasImage: true, textLength: 17 });
    expect(fitsLiveTime(pictured, 15)).toBe(false);
    expect(fitsLiveTime(pictured, 20)).toBe(true);
  });

  it('has no mathematics for 10 seconds even at its shortest', () => {
    expect(
      fitsLiveTime(question({ subjectSlug: 'mathematics', textLength: 0 }), 10),
    ).toBe(false);
  });
});
