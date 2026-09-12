import { QuestionType } from '@prisma/client';
import type { NmtPaper, NmtTask } from '../nmt-paper.types';

/** Five options in a row of four: one question of a text, a point each. */
const singleChoice = (number: number): NmtTask => ({
  number,
  type: QuestionType.SINGLE_CHOICE,
  optionCount: 4,
  maxPoints: 1,
  scoring: 'whole',
});
/**
 * A matching task over a run of numbered texts or gaps: `rows` of them against
 * eight choices A–H, so the spares are what is left of the eight. It fills a
 * row of the answer sheet per text, and a point is earned per row.
 */
const matching = (number: number, rows: number): NmtTask => ({
  number,
  type: QuestionType.MATCHING,
  optionCount: rows + 8,
  covers: rows,
  maxPoints: rows,
  scoring: 'per-pair',
});

/**
 * НМТ 2026, English — the demonstration paper's structure
 * (testportal.gov.ua, NMT-2026_anglijska-mova_demo.pdf).
 *
 * Six tasks over 32 numbers, every one of them hanging off a text:
 *
 * | Task | Numbers | What it is |
 * |---|---|---|
 * | 1 | 1–5 | five short texts matched to eight statements |
 * | 2 | 6–10 | one long text, five questions on it |
 * | 3 | 11–16 | six descriptions matched to eight statements |
 * | 4 | 17–22 | a text with six gaps, eight fragments to fill them |
 * | 5 | 23–27 | a text with five gaps, a word to choose for each |
 * | 6 | 28–32 | the same, on grammar |
 *
 * Tasks 1, 3 and 4 are one question each over a run of numbers — which is why
 * a task carries `covers` (docs/02-domain/nmt-paper.md §3) — so the paper is
 * 18 questions and 32 points, the published maximum.
 *
 * The instructions are the paper's own, in English as it prints them.
 */
export const ENGLISH_LANGUAGE_PAPER: NmtPaper = {
  subjectSlug: 'english-language',
  title: 'НМТ з англійської мови',
  minutes: 60,
  timingNote:
    'На НМТ англійська мова йде другим блоком разом з історією України — 120 хвилин на двох, і час між ними ви розподіляєте самі. Для самої англійської — 60 хвилин.',
  tasks: [
    matching(1, 5),
    ...[6, 7, 8, 9, 10].map(singleChoice),
    matching(11, 6),
    matching(17, 6),
    ...[23, 24, 25, 26, 27].map(singleChoice),
    ...[28, 29, 30, 31, 32].map(singleChoice),
  ],
  sections: [
    {
      from: 1,
      to: 5,
      instruction:
        'Read the texts below. Match choices (A–H) to (1–5). There are three choices you do not need to use.',
    },
    {
      from: 6,
      to: 10,
      instruction:
        'Read the text below. For questions (6 – 10) choose the correct answer (A, B, C or D).',
    },
    {
      from: 11,
      to: 16,
      instruction:
        'Read the texts below. Match choices (A–H) to (11–16). There are two choices you do not need to use.',
    },
    {
      from: 17,
      to: 22,
      instruction:
        'Read the text below. Choose from (A–H) the one which best fits each space (17–22). There are two choices you do not need to use.',
    },
    {
      from: 23,
      to: 27,
      instruction:
        'Read the text below. For questions (23–27) choose the correct answer (A, B, C or D).',
    },
    {
      from: 28,
      to: 32,
      instruction:
        'Read the text below. For questions (28–32) choose the correct answer (A, B, C or D).',
    },
  ],
  passageBlocks: [
    { from: 6, to: 10 },
    { from: 23, to: 27 },
    { from: 28, to: 32 },
  ],
  scale: {
    threshold: 5,
    table: {
      5: 100,
      6: 109,
      7: 118,
      8: 125,
      9: 131,
      10: 134,
      11: 137,
      12: 140,
      13: 143,
      14: 145,
      15: 147,
      16: 148,
      17: 149,
      18: 150,
      19: 151,
      20: 152,
      21: 153,
      22: 155,
      23: 157,
      24: 159,
      25: 162,
      26: 166,
      27: 169,
      28: 173,
      29: 179,
      30: 185,
      31: 191,
      32: 200,
    },
    source:
      'Таблиця переведення тестових балів НМТ 2026 у шкалу 100–200 (Порядок прийому на навчання для здобуття вищої освіти у 2026 році)',
  },
};
