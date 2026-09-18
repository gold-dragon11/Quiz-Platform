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

/** Practice the demo student has done on her own, oldest first. */
export const DEMO_PRACTICE: {
  subject: string;
  topic: string;
  daysAgo: number;
  accuracy: number;
}[] = [
  {
    subject: 'mathematics',
    topic: 'quadratic-functions',
    daysAgo: 20,
    accuracy: 0.55,
  },
  {
    subject: 'ukrainian-language',
    topic: 'orthography',
    daysAgo: 17,
    accuracy: 0.65,
  },
  { subject: 'mathematics', topic: 'planimetry', daysAgo: 13, accuracy: 0.6 },
  {
    subject: 'history-of-ukraine',
    topic: 'kyivan-rus',
    daysAgo: 10,
    accuracy: 0.75,
  },
  {
    subject: 'ukrainian-language',
    topic: 'punctuation',
    daysAgo: 6,
    accuracy: 0.7,
  },
  {
    subject: 'english-language',
    topic: 'present-tenses',
    daysAgo: 2,
    accuracy: 0.85,
  },
];
