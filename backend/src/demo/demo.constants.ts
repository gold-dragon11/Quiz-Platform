import { UserRole } from '@prisma/client';

/**
 * The public demo (docs/08-development/deployment.md §17.9).
 *
 * The password is published in the README on purpose — it is the point of a
 * demo account. What keeps that safe is not secrecy but what the accounts are
 * denied (NotDemoGuard, sealed groups and duels) and the nightly reset.
 */
export const DEMO_PASSWORD = 'LsDemo2026!';

export interface DemoAccountSpec {
  key: string;
  email: string;
  username: string;
  displayName: string;
  bio: string | null;
  role: UserRole;
  /** Published in the README; the rest sign in with a random password. */
  published: boolean;
}

export const DEMO_STUDENT: DemoAccountSpec = {
  key: 'student',
  email: 'demo-student@learn-ls.com',
  username: 'olena_demo',
  displayName: 'Олена Коваленко',
  bio: '11 клас. Готуюся до НМТ з математики та історії.',
  role: UserRole.USER,
  published: true,
};

export const DEMO_TEACHER: DemoAccountSpec = {
  key: 'teacher',
  email: 'demo-teacher@learn-ls.com',
  username: 'iryna_demo',
  displayName: 'Ірина Мельник',
  bio: 'Репетиторка з математики.',
  role: UserRole.TEACHER,
  published: true,
};

/**
 * Classmates: the teacher's review screens are empty with one student in the
 * group, and a duel needs an opponent. Each has a fixed level of accuracy so
 * the group's results spread the way a real class does.
 */
export const DEMO_CLASSMATES: (DemoAccountSpec & { accuracy: number })[] = [
  ['andrii_demo', 'Андрій Бондар', 0.9],
  ['sofiia_demo', 'Софія Ткаченко', 0.82],
  ['maksym_demo', 'Максим Шевчук', 0.66],
  ['daryna_demo', 'Дарина Кравець', 0.74],
  ['nazar_demo', 'Назар Олійник', 0.48],
  ['viktoriia_demo', 'Вікторія Поліщук', 0.58],
].map(([username, displayName, accuracy], index) => ({
  key: `classmate-${index + 1}`,
  email: `demo-classmate-${index + 1}@learn-ls.com`,
  username: username as string,
  displayName: displayName as string,
  bio: null,
  role: UserRole.USER,
  published: false,
  accuracy: accuracy as number,
}));

/** One thing the demo student did on her own. */
export type DemoStep =
  | {
      kind: 'practice';
      subject: string;
      topic: string;
      daysAgo: number;
      accuracy: number;
      /** Questions in the test; 10 unless a topic needs more to reach ten answers. */
      questions?: number;
    }
  | {
      kind: 'mock';
      subject: string;
      daysAgo: number;
      accuracy: number;
      minutes: number;
    }
  | { kind: 'review'; daysAgo: number; accuracy: number; count: number };

/**
 * The demo student's month, oldest first, played through the engine in this
 * order so the mistake ladder moves the way it would have.
 *
 * It has to show progress, not only practice (decision 46): early tests leave
 * mistakes, three reviews a few days apart carry some of them up every rung
 * and off the ladder, and a return to the weak topic of the first week goes
 * well — so the statistics show mistakes fixed and topics mastered beside the
 * ones still in progress, and the ladder still has a review due today.
 */
export const DEMO_TIMELINE: DemoStep[] = [
  {
    kind: 'practice',
    subject: 'mathematics',
    topic: 'quadratic-functions',
    daysAgo: 24,
    accuracy: 0.55,
  },
  {
    kind: 'practice',
    subject: 'ukrainian-language',
    topic: 'orthography',
    daysAgo: 21,
    accuracy: 0.65,
  },
  { kind: 'review', daysAgo: 20, accuracy: 1, count: 15 },
  { kind: 'review', daysAgo: 17, accuracy: 1, count: 15 },
  {
    kind: 'practice',
    subject: 'mathematics',
    topic: 'planimetry',
    daysAgo: 14,
    accuracy: 0.6,
  },
  { kind: 'review', daysAgo: 13, accuracy: 1, count: 15 },
  {
    kind: 'practice',
    subject: 'history-of-ukraine',
    topic: 'kyivan-rus',
    daysAgo: 10,
    accuracy: 0.75,
  },
  { kind: 'review', daysAgo: 9, accuracy: 0.8, count: 12 },
  {
    kind: 'mock',
    subject: 'mathematics',
    daysAgo: 8,
    accuracy: 0.72,
    minutes: 128,
  },
  {
    kind: 'practice',
    subject: 'ukrainian-language',
    topic: 'punctuation',
    daysAgo: 6,
    accuracy: 0.7,
  },
  {
    kind: 'practice',
    subject: 'mathematics',
    topic: 'quadratic-functions',
    daysAgo: 5,
    accuracy: 1,
  },
  {
    kind: 'mock',
    subject: 'history-of-ukraine',
    daysAgo: 4,
    accuracy: 0.6,
    minutes: 104,
  },
  { kind: 'review', daysAgo: 4, accuracy: 0.75, count: 15 },
  {
    kind: 'practice',
    subject: 'english-language',
    // Twelve, because the demo answers no matching question and a topic is
    // judged on its last ten answers.
    topic: 'conditionals',
    daysAgo: 2,
    accuracy: 1,
    questions: 12,
  },
  { kind: 'review', daysAgo: 1, accuracy: 0.7, count: 15 },
];
