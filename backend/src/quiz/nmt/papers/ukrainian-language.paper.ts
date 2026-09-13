import { QuestionType } from '@prisma/client';
import type { NmtPaper, NmtTask } from '../nmt-paper.types';

const singleChoice = (number: number): NmtTask => ({
  number,
  type: QuestionType.SINGLE_CHOICE,
  // 1–10 print four options, 11–25 five.
  optionCount: number <= 10 ? 4 : 5,
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

/**
 * НМТ 2026, Ukrainian — the demonstration paper's structure
 * (testportal.gov.ua, NMT-2026_ukrayinska-mova_demo.pdf).
 *
 * 30 tasks: 1–10 choose one of four, 11–25 one of five (a point each), 26–30
 * match four prompts against five choices (a point per pair). 25 + 20 = 45,
 * the published maximum. 21–25 are asked about one text: five sentences of a
 * paragraph printed out of order, marked with shapes so the letters stay free
 * for the options. What each number tests is set out in
 * docs/02-domain/nmt-paper.md.
 *
 * The instructions are the paper's own. For 26–30 the answer-sheet sentence
 * speaks of the table on screen rather than "таблиці відповідей до завдань".
 */
export const UKRAINIAN_LANGUAGE_PAPER: NmtPaper = {
  subjectSlug: 'ukrainian-language',
  title: 'НМТ з української мови',
  minutes: 60,
  timingNote:
    'На НМТ українська мова й математика йдуть одним блоком на 120 хвилин, і час між ними ви розподіляєте самі. Для однієї української — 60 хвилин.',
  tasks: [
    ...Array.from({ length: 25 }, (_, i) => singleChoice(i + 1)),
    ...[26, 27, 28, 29, 30].map(matching),
  ],
  sections: [
    {
      from: 1,
      to: 10,
      instruction:
        'Завдання 1–10 мають по чотири варіанти відповіді, з яких лише ОДИН ПРАВИЛЬНИЙ. Виберіть правильний, на Вашу думку, варіант відповіді й позначте його.',
    },
    {
      from: 11,
      to: 20,
      instruction:
        'Завдання 11–25 мають по п’ять варіантів відповіді, з яких лише ОДИН ПРАВИЛЬНИЙ. Виберіть правильний, на Вашу думку, варіант відповіді й позначте його.',
    },
    {
      from: 21,
      to: 25,
      instruction:
        'Завдання 21–25 стосуються речень, що первинно, в іншій послідовності, становили зв’язний текст. Прочитайте речення й виконайте завдання до них.',
    },
    {
      from: 26,
      to: 30,
      instruction:
        'У завданнях 26–30 до кожного із чотирьох фрагментів інформації, позначених цифрою, доберіть один правильний, на Вашу думку, варіант, позначений буквою. Поставте позначки в таблиці на перетині відповідних рядків (цифри) і колонок (букви).',
    },
  ],
  passageBlocks: [{ from: 21, to: 25 }],
  scale: {
    threshold: 8,
    table: {
      8: 100,
      9: 105,
      10: 110,
      11: 120,
      12: 125,
      13: 130,
      14: 134,
      15: 136,
      16: 138,
      17: 140,
      18: 142,
      19: 143,
      20: 144,
      21: 145,
      22: 146,
      23: 148,
      24: 149,
      25: 150,
      26: 152,
      27: 154,
      28: 156,
      29: 157,
      30: 159,
      31: 160,
      32: 162,
      33: 163,
      34: 165,
      35: 167,
      36: 170,
      37: 172,
      38: 175,
      39: 177,
      40: 180,
      41: 183,
      42: 186,
      43: 191,
      44: 195,
      45: 200,
    },
    source:
      'Таблиця переведення тестових балів НМТ 2026 у шкалу 100–200 (Порядок прийому на навчання для здобуття вищої освіти у 2026 році)',
  },
};
