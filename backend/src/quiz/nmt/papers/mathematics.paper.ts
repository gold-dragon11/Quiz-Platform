import { QuestionType } from '@prisma/client';
import type { NmtPaper, NmtTask } from '../nmt-paper.types';

const singleChoice = (number: number): NmtTask => ({
  number,
  type: QuestionType.SINGLE_CHOICE,
  maxPoints: 1,
  scoring: 'whole',
});
const matching = (number: number): NmtTask => ({
  number,
  type: QuestionType.MATCHING,
  maxPoints: 3,
  scoring: 'per-pair',
});
const shortAnswer = (number: number): NmtTask => ({
  number,
  type: QuestionType.NUMERIC,
  maxPoints: 2,
  scoring: 'whole',
});

/**
 * НМТ 2026, mathematics — the demonstration paper's structure
 * (testportal.gov.ua, NMT-2026_matematyka_demo.pdf).
 *
 * 22 tasks: 1–15 choose one of five (1 point each), 16–18 match three prompts
 * against five choices (a point per pair), 19–22 short numeric answers
 * (2 points each). 15 + 9 + 8 = 32, the published maximum.
 *
 * The instructions are the paper's own, with one change: "у спеціально
 * відведеному місці" on the answer sheet becomes the answer field on screen.
 */
export const MATHEMATICS_PAPER: NmtPaper = {
  subjectSlug: 'mathematics',
  title: 'НМТ з математики',
  minutes: 60,
  timingNote:
    'На НМТ математика й українська мова йдуть одним блоком на 120 хвилин, і час між ними ви розподіляєте самі. Для однієї математики — 60 хвилин.',
  tasks: [
    ...Array.from({ length: 15 }, (_, i) => singleChoice(i + 1)),
    ...[16, 17, 18].map(matching),
    ...[19, 20, 21, 22].map(shortAnswer),
  ],
  sections: [
    {
      from: 1,
      to: 15,
      instruction:
        'Завдання 1–15 мають по п’ять варіантів відповіді, з яких лише ОДИН ПРАВИЛЬНИЙ. Виберіть правильний, на Вашу думку, варіант відповіді й позначте його.',
    },
    {
      from: 16,
      to: 18,
      instruction:
        'У завданнях 16–18 до кожного з трьох рядків інформації, позначених цифрами, доберіть один правильний, на Вашу думку, варіант відповіді, позначений буквою.',
    },
    {
      from: 19,
      to: 22,
      instruction:
        'Розв’яжіть завдання 19–22. Одержані числові відповіді запишіть у полі відповіді. Відповідь записуйте лише десятковим дробом, урахувавши положення коми. Знак «мінус» записуйте перед першою цифрою числа.',
    },
  ],
  scale: {
    threshold: 5,
    table: {
      5: 100,
      6: 108,
      7: 115,
      8: 123,
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
      21: 155,
      22: 159,
      23: 163,
      24: 167,
      25: 170,
      26: 173,
      27: 176,
      28: 180,
      29: 184,
      30: 189,
      31: 194,
      32: 200,
    },
    source:
      'Таблиця переведення тестових балів НМТ 2026 у шкалу 100–200 (Порядок прийому на навчання для здобуття вищої освіти у 2026 році)',
  },
};
