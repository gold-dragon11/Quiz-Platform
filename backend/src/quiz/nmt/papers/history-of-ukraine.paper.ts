import { QuestionType } from '@prisma/client';
import type { NmtPaper, NmtTask } from '../nmt-paper.types';

const singleChoice = (number: number): NmtTask => ({
  number,
  type: QuestionType.SINGLE_CHOICE,
  optionCount: 4,
  maxPoints: 1,
  scoring: 'whole',
});
// Four prompts and five choices.
const matching = (number: number): NmtTask => ({
  number,
  type: QuestionType.MATCHING,
  optionCount: 9,
  maxPoints: 4,
  scoring: 'per-pair',
});
const sequence = (number: number): NmtTask => ({
  number,
  type: QuestionType.ORDERING,
  optionCount: 4,
  maxPoints: 3,
  scoring: 'sequence',
});
const threeOfSeven = (number: number): NmtTask => ({
  number,
  type: QuestionType.MULTIPLE_CHOICE,
  optionCount: 7,
  maxPoints: 3,
  scoring: 'per-correct',
});

/**
 * НМТ 2026, history of Ukraine — the demonstration paper's structure
 * (testportal.gov.ua, NMT-2026_istoriya-Ukrayiny_demo.pdf).
 *
 * 30 tasks: 1–20 choose one of four (1 point each), 21–24 match four prompts
 * against five choices (a point per pair), 25–27 put four events in order
 * (3 points, or 2 for both ends, or 1 for one of them), 28–30 choose three of
 * seven (a point per correct digit). 20 + 16 + 9 + 9 = 54, the published
 * maximum. The numbers run roughly chronologically, from the stone age to
 * independence; what each tests is set out in docs/02-domain/nmt-paper.md.
 *
 * Sixty minutes: on the exam history shares a 120-minute block with the
 * elective subject, and the student divides the time.
 */
export const HISTORY_OF_UKRAINE_PAPER: NmtPaper = {
  subjectSlug: 'history-of-ukraine',
  title: 'НМТ з історії України',
  minutes: 60,
  timingNote:
    'На НМТ історія України йде одним блоком із предметом на вибір: 120 хвилин на двох, і час між ними ви розподіляєте самі. Для самої історії — 60 хвилин.',
  tasks: [
    ...Array.from({ length: 20 }, (_, i) => singleChoice(i + 1)),
    ...[21, 22, 23, 24].map(matching),
    ...[25, 26, 27].map(sequence),
    ...[28, 29, 30].map(threeOfSeven),
  ],
  sections: [
    {
      from: 1,
      to: 20,
      instruction:
        'Завдання 1–20 мають по чотири варіанти відповіді, з яких лише один правильний. Виберіть правильний, на Вашу думку, варіант відповіді й позначте його.',
    },
    {
      from: 21,
      to: 24,
      instruction:
        'У завданнях 21–24 до кожного з чотирьох фрагментів інформації, позначених цифрою, доберіть один правильний, на Вашу думку, варіант, позначений буквою. Поставте позначки в таблиці на перетині відповідних рядків (цифри) і колонок (букви).',
    },
    {
      from: 25,
      to: 27,
      instruction:
        'У завданнях 25–27 розташуйте події в хронологічній послідовності. Цифрі 1 має відповідати вибрана Вами перша подія, цифрі 2 — друга, цифрі 3 — третя, цифрі 4 — четверта.',
    },
    {
      from: 28,
      to: 30,
      instruction:
        'Завдання 28–30 мають по сім варіантів відповідей, з яких лише три правильні. Виберіть три варіанти, що позначають правильні, на Вашу думку, відповіді.',
    },
  ],
  passageBlocks: [],
  scale: {
    threshold: 9,
    table: {
      9: 100,
      10: 105,
      11: 110,
      12: 115,
      13: 120,
      14: 125,
      15: 130,
      16: 132,
      17: 134,
      18: 136,
      19: 138,
      20: 140,
      21: 141,
      22: 142,
      23: 143,
      24: 144,
      25: 145,
      26: 146,
      27: 147,
      28: 148,
      29: 149,
      30: 150,
      31: 151,
      32: 152,
      33: 154,
      34: 156,
      35: 158,
      36: 160,
      37: 163,
      38: 166,
      39: 168,
      40: 169,
      41: 170,
      42: 172,
      43: 173,
      44: 175,
      45: 177,
      46: 179,
      47: 181,
      48: 183,
      49: 185,
      50: 188,
      51: 191,
      52: 194,
      53: 197,
      54: 200,
    },
    source:
      'Таблиця переведення тестових балів НМТ 2026 у шкалу 100–200 (Порядок прийому на навчання для здобуття вищої освіти у 2026 році)',
  },
};
