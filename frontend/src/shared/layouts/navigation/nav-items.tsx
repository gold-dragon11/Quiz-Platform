import type { ReactNode } from 'react';
import { ROUTES } from '@/shared/constants/routes';

export interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  adminOnly?: boolean;
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

/** Full navigation (sidebar + slide-out menu). Admin is filtered by role. */
export const NAV_ITEMS: NavItem[] = [
  { to: ROUTES.dashboard, label: 'Головна', icon: icons.dashboard },
  { to: ROUTES.quiz, label: 'Тест', icon: icons.quiz },
  { to: ROUTES.subjects, label: 'Предмети', icon: icons.subjects },
  { to: ROUTES.statistics, label: 'Статистика', icon: icons.statistics },
  { to: ROUTES.profile, label: 'Профіль', icon: icons.profile },
  { to: ROUTES.settings, label: 'Налаштування', icon: icons.settings },
  { to: ROUTES.admin, label: 'Адміністрування', icon: icons.admin, adminOnly: true },
];

/** Condensed navigation for the mobile bottom bar (no admin/settings). */
export const BOTTOM_NAV_ITEMS: NavItem[] = [
  { to: ROUTES.dashboard, label: 'Головна', icon: icons.dashboard },
  { to: ROUTES.quiz, label: 'Тест', icon: icons.quiz },
  { to: ROUTES.subjects, label: 'Предмети', icon: icons.subjects },
  { to: ROUTES.statistics, label: 'Статистика', icon: icons.statistics },
  { to: ROUTES.profile, label: 'Профіль', icon: icons.profile },
];

/** Resolves the current page title from a pathname (for the header). */
export function getPageTitle(pathname: string): string {
  if (pathname.startsWith('/dashboard')) return 'Головна';
  if (pathname.startsWith('/subjects')) return 'Предмети';
  if (pathname.startsWith('/quiz')) return 'Тест';
  if (pathname.startsWith('/statistics')) return 'Статистика';
  if (pathname.startsWith('/profile')) return 'Профіль';
  if (pathname.startsWith('/settings')) return 'Налаштування';
  if (pathname.startsWith('/admin')) return 'Адміністрування';
  return 'L&S';
}

/** Filters the admin-only items out for non-admins. */
export function visibleNavItems(items: NavItem[], isAdmin: boolean): NavItem[] {
  return items.filter((item) => !item.adminOnly || isAdmin);
}
