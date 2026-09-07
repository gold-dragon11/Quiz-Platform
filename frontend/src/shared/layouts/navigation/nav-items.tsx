import type { ReactNode } from 'react';
import { ROUTES } from '@/shared/constants/routes';
import { UserRole } from '@/shared/types/enums';

export interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  /**
   * Roles this entry is for. Omitted means everyone.
   *
   * A list rather than the `adminOnly` flag it replaces: the moment a second
   * role appeared, booleans would have multiplied one per role and the two
   * call sites would have had to know about each of them.
   */
  roles?: UserRole[];
}

const ICON = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

const icons = {
  dashboard: (
    <svg {...ICON} aria-hidden="true">
      <path d="M3 13h8V3H3zM13 21h8V3h-8zM3 21h8v-6H3z" />
    </svg>
  ),
  quiz: (
    <svg {...ICON} aria-hidden="true">
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  ),
  subjects: (
    <svg {...ICON} aria-hidden="true">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  ),
  mockExam: (
    <svg {...ICON} aria-hidden="true">
      <path d="M8 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-2" />
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <path d="M12 11v3M12 17h.01" />
    </svg>
  ),
  assignments: (
    <svg {...ICON} aria-hidden="true">
      <path d="M9 3h6a1 1 0 0 1 1 1v1H8V4a1 1 0 0 1 1-1z" />
      <path d="M16 5h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2" />
      <path d="m9 13 2 2 4-4" />
    </svg>
  ),
  bank: (
    <svg {...ICON} aria-hidden="true">
      <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4H19v14H6.5A2.5 2.5 0 0 0 4 20.5z" />
      <path d="M9 8h6M9 11.5h4" />
    </svg>
  ),
  groups: (
    <svg {...ICON} aria-hidden="true">
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
      <path d="M16 5.5a3 3 0 0 1 0 5.6M17.5 20a5.4 5.4 0 0 0-2.2-4.3" />
    </svg>
  ),
  duels: (
    <svg {...ICON} aria-hidden="true">
      <path d="M14.5 17.5 3 6V3h3l11.5 11.5" />
      <path d="m13 19 6-6M16 16l4 4M19 21l2-2" />
      <path d="M5 21 3 19l1.5-1.5" />
    </svg>
  ),
  mistakeReview: (
    <svg {...ICON} aria-hidden="true">
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5" />
    </svg>
  ),
  statistics: (
    <svg {...ICON} aria-hidden="true">
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </svg>
  ),
  profile: (
    <svg {...ICON} aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  ),
  settings: (
    <svg {...ICON} aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" />
    </svg>
  ),
  admin: (
    <svg {...ICON} aria-hidden="true">
      <path d="M12 2l8 4v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6z" />
    </svg>
  ),
};

/**
 * Entries only a learner has any use for.
 *
 * Spelled out as "everyone except a teacher" rather than `[USER]`: an
 * administrator managing the question bank has a real reason to sit a test and
 * see what a learner sees, while a teacher does not — they set the work, they
 * do not do it.
 */
const LEARNERS = [UserRole.USER, UserRole.ADMIN];

/** Full navigation (sidebar + slide-out menu), filtered by role. */
export const NAV_ITEMS: NavItem[] = [
  { to: ROUTES.dashboard, label: 'Головна', icon: icons.dashboard },
  { to: ROUTES.quiz, label: 'Тест', icon: icons.quiz, roles: LEARNERS },
  { to: ROUTES.mockExam, label: 'Пробний НМТ', icon: icons.mockExam },
  { to: ROUTES.mistakeReview, label: 'Повторення', icon: icons.mistakeReview, roles: LEARNERS },
  { to: ROUTES.duels, label: 'Дуелі', icon: icons.duels, roles: LEARNERS },
  { to: ROUTES.assignments, label: 'Домашка', icon: icons.assignments, roles: [UserRole.USER] },
  { to: ROUTES.groups, label: 'Мої групи', icon: icons.groups, roles: [UserRole.USER] },
  {
    to: ROUTES.teacherGroups,
    label: 'Групи',
    icon: icons.groups,
    roles: [UserRole.TEACHER],
  },
  {
    to: ROUTES.teacherQuestions,
    label: 'Банк питань',
    icon: icons.bank,
    roles: [UserRole.TEACHER],
  },
  { to: ROUTES.subjects, label: 'Предмети', icon: icons.subjects },
  { to: ROUTES.statistics, label: 'Статистика', icon: icons.statistics },
  { to: ROUTES.profile, label: 'Профіль', icon: icons.profile },
  { to: ROUTES.settings, label: 'Налаштування', icon: icons.settings },
  { to: ROUTES.admin, label: 'Адміністрування', icon: icons.admin, roles: [UserRole.ADMIN] },
];

/**
 * Condensed navigation for the mobile bottom bar.
 *
 * Role-filtered like the sidebar, and it has to be: the bar showed a teacher
 * "Тест" long after the sidebar had stopped, because it was a second list
 * nobody remembered to gate. Five slots is the ceiling — at six each label
 * gets about 65px, too narrow for "Налаштування" — and the role filter is
 * what keeps any one person under it. Count it when adding an entry: a
 * learner sees five (головна, тест, домашка, статистика, налаштування), a
 * teacher five (головна, групи, питання, статистика, налаштування), an
 * administrator four. Subjects lives in the slide-out menu only — it was the
 * sixth slot, and six does not fit.
 *
 * Settings is here because the sidebar is desktop-only and the dashboard quick
 * action that used to reach it has been removed. Profile is not: the avatar in
 * the top-right already opens a menu with Profile as its first entry, and six
 * slots would leave each label ~65px — too narrow for "Налаштування".
 */
export const BOTTOM_NAV_ITEMS: NavItem[] = [
  { to: ROUTES.dashboard, label: 'Головна', icon: icons.dashboard },
  { to: ROUTES.quiz, label: 'Тест', icon: icons.quiz, roles: LEARNERS },
  { to: ROUTES.assignments, label: 'Домашка', icon: icons.assignments, roles: [UserRole.USER] },
  { to: ROUTES.teacherGroups, label: 'Групи', icon: icons.groups, roles: [UserRole.TEACHER] },
  {
    to: ROUTES.teacherQuestions,
    label: 'Питання',
    icon: icons.bank,
    roles: [UserRole.TEACHER],
  },
  { to: ROUTES.statistics, label: 'Статистика', icon: icons.statistics },
  { to: ROUTES.settings, label: 'Налаштування', icon: icons.settings },
];

/** Resolves the current page title from a pathname (for the header). */
export function getPageTitle(pathname: string): string {
  if (pathname.startsWith('/dashboard')) return 'Головна';
  if (pathname.startsWith('/subjects')) return 'Предмети';
  if (pathname.startsWith('/quiz')) return 'Тест';
  if (pathname.startsWith('/mock-exam')) return 'Пробний НМТ';
  if (pathname.startsWith('/mistake-review')) return 'Повторення помилок';
  if (pathname.startsWith('/duels')) return 'Дуелі';
  if (pathname.startsWith('/teacher/groups')) return 'Групи';
  if (pathname.startsWith('/teacher/questions')) return 'Банк питань';
  if (pathname.startsWith('/assignments')) return 'Домашка';
  if (pathname.startsWith('/groups')) return 'Мої групи';
  if (pathname.startsWith('/statistics')) return 'Статистика';
  if (pathname.startsWith('/profile')) return 'Профіль';
  if (pathname.startsWith('/settings')) return 'Налаштування';
  if (pathname.startsWith('/admin')) return 'Адміністрування';
  return 'L&S';
}

/** Keeps the entries this role is allowed to see. */
export function visibleNavItems(items: NavItem[], role: UserRole | undefined): NavItem[] {
  return items.filter((item) => !item.roles || (role !== undefined && item.roles.includes(role)));
}
