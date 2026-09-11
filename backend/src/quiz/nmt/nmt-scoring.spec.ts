import { QuestionType } from '@prisma/client';
import type { NmtPaper } from './nmt-paper.types';
import { MATHEMATICS_PAPER } from './papers/mathematics.paper';
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
  tasks: [
    {
      number: 1,
      type: QuestionType.SINGLE_CHOICE,
      maxPoints: 1,
      scoring: 'whole',
    },
    {
      number: 2,
      type: QuestionType.MATCHING,
      maxPoints: 3,
      scoring: 'per-pair',
    },
    { number: 3, type: QuestionType.NUMERIC, maxPoints: 2, scoring: 'whole' },
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

describe('the mathematics paper', () => {
  it('matches the published shape: 22 tasks worth 32 points', () => {
    expect(MATHEMATICS_PAPER.tasks).toHaveLength(22);
    expect(maxTestPoints(MATHEMATICS_PAPER)).toBe(32);
  });

  it('converts every possible total from the threshold to the maximum', () => {
    for (let points = 0; points <= 32; points += 1) {
      const score = scaledScore(MATHEMATICS_PAPER, points);
      if (points < MATHEMATICS_PAPER.scale.threshold) {
        expect(score).toBeNull();
      } else {
        expect(score).toBeGreaterThanOrEqual(100);
        expect(score).toBeLessThanOrEqual(200);
      }
    }
    expect(scaledScore(MATHEMATICS_PAPER, 32)).toBe(200);
  });

  it('covers every task number with exactly one section instruction', () => {
    for (const task of MATHEMATICS_PAPER.tasks) {
      const sections = MATHEMATICS_PAPER.sections.filter(
        (section) => section.from <= task.number && task.number <= section.to,
      );
      expect(sections).toHaveLength(1);
    }
  });
});
