import { QuestionType } from '@prisma/client';
import type { NmtPaper } from './nmt-paper.types';
import { DEFAULT_NMT_BLOCKS, DEFAULT_NMT_PAPERS } from './nmt-papers';
import { MATHEMATICS_PAPER } from './papers/mathematics.paper';
import { UKRAINIAN_LANGUAGE_PAPER } from './papers/ukrainian-language.paper';
import {
  maxTestPoints,
  scaledScore,
  scorePaper,
  taskPoints,
  type ScorableQuestion,
} from './nmt-scoring';

const paper: NmtPaper = {
  subjectSlug: 'test',
  title: 'Test paper',
  minutes: 10,
  timingNote: '',
  sections: [],
  passageBlocks: [],
  tasks: [
    {
      number: 1,
      type: QuestionType.SINGLE_CHOICE,
      optionCount: 2,
      maxPoints: 1,
      scoring: 'whole',
    },
    {
      number: 2,
      type: QuestionType.MATCHING,
      optionCount: 8,
      maxPoints: 3,
      scoring: 'per-pair',
    },
    {
      number: 3,
      type: QuestionType.NUMERIC,
      optionCount: null,
      maxPoints: 2,
      scoring: 'whole',
    },
  ],
  scale: {
    threshold: 2,
    table: { 2: 100, 3: 120, 4: 140, 5: 170, 6: 200 },
    source: 'test',
  },
};

const single: ScorableQuestion = {
  id: 'sc',
  type: QuestionType.SINGLE_CHOICE,
  nmtTask: 1,
  configuration: null,
  answerOptions: [
    { id: 'right', order: 0, isCorrect: true },
    { id: 'wrong', order: 1, isCorrect: false },
  ],
};

// Prompts at orders 0–2, choices at 3–7; the key pairs 0→3, 1→4, 2→5.
const matching: ScorableQuestion = {
  id: 'mt',
  type: QuestionType.MATCHING,
  nmtTask: 2,
  configuration: {
    pairs: [
      { left: 0, right: 3 },
      { left: 1, right: 4 },
      { left: 2, right: 5 },
    ],
  },
  answerOptions: ['p0', 'p1', 'p2', 'c3', 'c4', 'c5', 'c6', 'c7'].map(
    (id, order) => ({
      id,
      order,
      isCorrect: false,
    }),
  ),
};

const numeric: ScorableQuestion = {
  id: 'nm',
  type: QuestionType.NUMERIC,
  nmtTask: 3,
  configuration: { answer: 12.5 },
  answerOptions: [],
};

const [scTask, mtTask, nmTask] = paper.tasks;

describe('taskPoints', () => {
  it('gives a single choice its point only when it is right', () => {
    expect(taskPoints(scTask, single, { answerOptionId: 'right' })).toBe(1);
    expect(taskPoints(scTask, single, { answerOptionId: 'wrong' })).toBe(0);
  });

  it('counts a matching task pair by pair, as the exam does', () => {
    expect(
      taskPoints(mtTask, matching, {
        pairs: [
          { left: 'p0', right: 'c3' },
          { left: 'p1', right: 'c4' },
          { left: 'p2', right: 'c6' },
        ],
      }),
    ).toBe(2);
    expect(
      taskPoints(mtTask, matching, {
        pairs: [
          { left: 'p0', right: 'c3' },
          { left: 'p1', right: 'c4' },
          { left: 'p2', right: 'c5' },
        ],
      }),
    ).toBe(3);
  });

  it('counts a prompt once even if the answer pairs it twice', () => {
    expect(
      taskPoints(mtTask, matching, {
        pairs: [
          { left: 'p0', right: 'c3' },
          { left: 'p0', right: 'c3' },
        ],
      }),
    ).toBe(1);
  });

  it('gives a short answer both points, written the way the answer sheet allows', () => {
    expect(taskPoints(nmTask, numeric, { numericAnswer: '12,5' })).toBe(2);
    expect(taskPoints(nmTask, numeric, { numericAnswer: '12' })).toBe(0);
  });

  it('never scores a missing, unreadable or mistyped answer', () => {
    expect(taskPoints(scTask, single, null)).toBe(0);
    expect(taskPoints(mtTask, matching, { pairs: 'nonsense' })).toBe(0);
    expect(taskPoints(scTask, numeric, { numericAnswer: '12,5' })).toBe(0);
  });
});

describe('scorePaper', () => {
  it('adds the tasks up in paper order and converts the total', () => {
    const result = scorePaper(
      paper,
      [numeric, matching, single],
      new Map([
        ['sc', { answerOptionId: 'right' }],
        ['mt', { pairs: [{ left: 'p0', right: 'c3' }] }],
        ['nm', { numericAnswer: '12.5' }],
      ]),
    );

    expect(result.tasks.map((task) => [task.number, task.points])).toEqual([
      [1, 1],
      [2, 1],
      [3, 2],
    ]);
    expect(result.testPoints).toBe(4);
    expect(result.maxTestPoints).toBe(6);
    expect(result.scaledScore).toBe(140);
  });

  it('has no score below the threshold', () => {
    expect(scaledScore(paper, 1)).toBeNull();
  });
});

describe.each(DEFAULT_NMT_PAPERS.map((p) => [p.subjectSlug, p] as const))(
  'the %s paper',
  (_, subjectPaper) => {
    const max = maxTestPoints(subjectPaper);

    it('numbers its tasks 1…n with nothing skipped', () => {
      expect(subjectPaper.tasks.map((task) => task.number)).toEqual(
        subjectPaper.tasks.map((_task, i) => i + 1),
      );
    });

    it('converts every total from the threshold up, never falling, to 200', () => {
      let previous = 0;
      for (let points = 0; points <= max; points += 1) {
        const score = scaledScore(subjectPaper, points);
        if (points < subjectPaper.scale.threshold) {
          expect(score).toBeNull();
          continue;
        }
        expect(score).not.toBeNull();
        expect(score).toBeGreaterThan(previous);
        previous = score ?? 0;
      }
      expect(scaledScore(subjectPaper, subjectPaper.scale.threshold)).toBe(100);
      expect(scaledScore(subjectPaper, max)).toBe(200);
    });

    it('covers every task number with exactly one section instruction', () => {
      for (const task of subjectPaper.tasks) {
        const sections = subjectPaper.sections.filter(
          (section) => section.from <= task.number && task.number <= section.to,
        );
        expect(sections).toHaveLength(1);
      }
    });

    it('gives every choice task its option count and a short answer none', () => {
      for (const task of subjectPaper.tasks) {
        if (task.type === QuestionType.NUMERIC) {
          expect(task.optionCount).toBeNull();
        } else {
          expect(task.optionCount).toBeGreaterThanOrEqual(4);
        }
      }
    });

    it('keeps each text block inside the paper, one per number', () => {
      const numbers = subjectPaper.passageBlocks.flatMap((block) => {
        expect(block.from).toBeLessThan(block.to);
        return Array.from(
          { length: block.to - block.from + 1 },
          (_n, i) => block.from + i,
        );
      });
      expect(new Set(numbers).size).toBe(numbers.length);
      for (const number of numbers) {
        expect(subjectPaper.tasks.some((task) => task.number === number)).toBe(
          true,
        );
      }
    });
  },
);

describe('the mathematics paper', () => {
  it('matches the published shape: 22 tasks worth 32 points', () => {
    expect(MATHEMATICS_PAPER.tasks).toHaveLength(22);
    expect(maxTestPoints(MATHEMATICS_PAPER)).toBe(32);
  });
});

describe('the Ukrainian paper', () => {
  const task = (number: number) => UKRAINIAN_LANGUAGE_PAPER.tasks[number - 1];

  it('matches the published shape: 30 tasks worth 45 points', () => {
    expect(UKRAINIAN_LANGUAGE_PAPER.tasks).toHaveLength(30);
    expect(maxTestPoints(UKRAINIAN_LANGUAGE_PAPER)).toBe(45);
  });

  it('prints four options in 1–10, five in 11–25, four pairs in 26–30', () => {
    expect(task(10)).toMatchObject({ type: 'SINGLE_CHOICE', optionCount: 4 });
    expect(task(11)).toMatchObject({ type: 'SINGLE_CHOICE', optionCount: 5 });
    expect(task(25)).toMatchObject({ type: 'SINGLE_CHOICE', optionCount: 5 });
    expect(task(26)).toMatchObject({
      type: 'MATCHING',
      optionCount: 9,
      maxPoints: 4,
      scoring: 'per-pair',
    });
  });

  it('asks 21–25 about one text', () => {
    expect(UKRAINIAN_LANGUAGE_PAPER.passageBlocks).toEqual([
      { from: 21, to: 25 },
    ]);
  });
});

describe('the joint blocks', () => {
  it.each(DEFAULT_NMT_BLOCKS.map((b) => [b.slug, b] as const))(
    '%s sets papers that exist, on the time of all of them together',
    (_, block) => {
      const papers = block.subjectSlugs.map((slug) =>
        DEFAULT_NMT_PAPERS.find((candidate) => candidate.subjectSlug === slug),
      );
      expect(papers.every(Boolean)).toBe(true);
      expect(block.minutes).toBe(
        papers.reduce((sum, candidate) => sum + (candidate?.minutes ?? 0), 0),
      );
    },
  );
});
