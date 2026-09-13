import type { ReactNode } from 'react';
import { LEARNER_ROLES, MOCK_EXAM_ROLES } from '@/shared/constants/roles';
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
  /**
   * Which block of the sidebar this belongs to. Entries sharing a section are
   * drawn together; a hairline separates one section from the next.
   *
   * Sections carry no visible caption. A caption would have to read sensibly
   * for every role, and after the role filter a section can come down to a
   * single entry — «Навчання» over one link is worse than no heading at all.
   * A rule groups just as well and is the same device the rest of the
   * interface already uses instead of boxes.
   */
  section: NavSection;
}

/** Sidebar blocks, in the order they are drawn. */
export type NavSection = 'overview' | 'learn' | 'class' | 'admin';

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

/** Entries only a learner has any use for — the same set the router serves. */
const LEARNERS = [...LEARNER_ROLES];

/**
 * Full navigation for the sidebar and the slide-out menu, filtered by role.
 *
 * «Профіль» and «Налаштування» are deliberately absent: the avatar menu in the
 * top-right already opens both, and carrying them here too made a nine-line
 * list where two lines were about the account rather than about studying.
 *
 * «Пробний НМТ» is open to a teacher as well. It was once a learner entry,
 * because a teacher sitting a mock collected XP and a level their statistics
 * page never shows. The backend now keeps XP out of a teacher's account, and a
 * teacher who is about to set a mock for a group has every reason to sit it
 * first (decision 29). It stays out of the bottom bar, which is full.
 */
export const NAV_ITEMS: NavItem[] = [
  { to: ROUTES.dashboard, label: 'Головна', icon: icons.dashboard, section: 'overview' },
  { to: ROUTES.statistics, label: 'Статистика', icon: icons.statistics, section: 'overview' },

  { to: ROUTES.quiz, label: 'Тест', icon: icons.quiz, roles: LEARNERS, section: 'learn' },
  {
    to: ROUTES.mockExam,
    label: 'Пробний НМТ',
    icon: icons.mockExam,
    roles: [...MOCK_EXAM_ROLES],
    section: 'learn',
  },
  {
    to: ROUTES.mistakeReview,
    label: 'Повторення',
    icon: icons.mistakeReview,
    roles: LEARNERS,
    section: 'learn',
  },
  { to: ROUTES.duels, label: 'Дуелі', icon: icons.duels, roles: LEARNERS, section: 'learn' },
  { to: ROUTES.subjects, label: 'Предмети', icon: icons.subjects, section: 'learn' },

  {
    to: ROUTES.assignments,
    label: 'Домашка',
    icon: icons.assignments,
    roles: [UserRole.USER],
    section: 'class',
  },
  { to: ROUTES.groups, label: 'Мої групи', icon: icons.groups, roles: [UserRole.USER], section: 'class' },
  {
    to: ROUTES.teacherGroups,
    label: 'Групи',
    icon: icons.groups,
    roles: [UserRole.TEACHER],
    section: 'class',
  },
  {
    to: ROUTES.teacherQuestions,
    label: 'Банк питань',
    icon: icons.bank,
    roles: [UserRole.TEACHER],
    section: 'class',
  },

  {
    to: ROUTES.admin,
    label: 'Адміністрування',
    icon: icons.admin,
    roles: [UserRole.ADMIN],
    section: 'admin',
  },
];

/**
 * Condensed navigation for the mobile bottom bar.
 *
 * Role-filtered like the sidebar, and it has to be: the bar showed a teacher
 * «Тест» long after the sidebar had stopped, because it was a second list
 * nobody remembered to gate. Five slots is the ceiling — at 390px each label
 * gets about 78px — and the role filter is what keeps any one person under it.
 * Count it when adding an entry: a learner sees five (головна, тест, домашка,
 * статистика, профіль), a teacher five (головна, групи, питання, статистика,
 * профіль), an administrator four.
 *
 * The fifth slot is «Профіль» rather than «Налаштування»: that word does not
 * fit 78px and ran into the edge of the screen. Profile is the shorter label,
 * it is now a screen with something on it, and it links onward to settings —
 * which is the rarer errand of the two.
 *
 * «Предмети» lives in the slide-out menu only; it was the sixth slot, and six
 * does not fit.
 */
export const BOTTOM_NAV_ITEMS: NavItem[] = [
  { to: ROUTES.dashboard, label: 'Головна', icon: icons.dashboard, section: 'overview' },
  { to: ROUTES.quiz, label: 'Тест', icon: icons.quiz, roles: LEARNERS, section: 'learn' },
  {
    to: ROUTES.assignments,
    label: 'Домашка',
    icon: icons.assignments,
    roles: [UserRole.USER],
    section: 'class',
  },
  {
    to: ROUTES.teacherGroups,
    label: 'Групи',
    icon: icons.groups,
    roles: [UserRole.TEACHER],
    section: 'class',
  },
  {
    to: ROUTES.teacherQuestions,
    label: 'Питання',
    icon: icons.bank,
    roles: [UserRole.TEACHER],
    section: 'class',
  },
  { to: ROUTES.statistics, label: 'Статистика', icon: icons.statistics, section: 'overview' },
  { to: ROUTES.profile, label: 'Профіль', icon: icons.profile, section: 'overview' },
];

/** Keeps the entries this role is allowed to see. */
export function visibleNavItems(items: NavItem[], role: UserRole | undefined): NavItem[] {
  return items.filter((item) => !item.roles || (role !== undefined && item.roles.includes(role)));
}
