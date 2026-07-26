import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ROUTES } from '@/shared/constants/routes';
import { DURATION, EASE, HOVER_LIFT } from '@/shared/constants/motion';

interface QuickAction {
  to: string;
  title: string;
  description: string;
  icon: ReactNode;
}

const ICON_PROPS = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

const ACTIONS: QuickAction[] = [
  {
    to: ROUTES.quiz,
    title: 'Start a quiz',
    description: 'Begin a new learning session',
    icon: (
      <svg {...ICON_PROPS} aria-hidden="true">
        <polygon points="6 4 20 12 6 20 6 4" />
      </svg>
    ),
  },
  {
    to: ROUTES.statistics,
    title: 'View statistics',
    description: 'Track your progress in detail',
    icon: (
      <svg {...ICON_PROPS} aria-hidden="true">
        <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
      </svg>
    ),
  },
  {
    to: ROUTES.profile,
    title: 'Your profile',
    description: 'Avatar and account details',
    icon: (
      <svg {...ICON_PROPS} aria-hidden="true">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </svg>
    ),
  },
  {
    to: ROUTES.settings,
    title: 'Settings',
    description: 'Password and account safety',
    icon: (
      <svg {...ICON_PROPS} aria-hidden="true">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" />
      </svg>
    ),
  },
];

/**
 * Quick Actions (docs/01-prd/dashboard.md §6, §11) — prominent navigation to
 * the core features. Each is a full card link with a subtle lift on hover
 * (docs/07-design/motion.md §8, ≤1.02 / soft elevation).
 */
export function QuickActions(): React.JSX.Element {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {ACTIONS.map((action) => (
        <motion.div
          key={action.to}
          whileHover={HOVER_LIFT}
          transition={{ duration: DURATION.fast, ease: EASE.out }}
        >
          <Link
            to={action.to}
            className="bg-surface border-border hover:border-border-subtle flex h-full flex-col gap-3 rounded-xl border p-5 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <span className="bg-surface-elevated text-primary flex size-10 items-center justify-center rounded-lg">
              {action.icon}
            </span>
            <span className="flex flex-col gap-0.5">
              <span className="text-text-primary font-medium">{action.title}</span>
              <span className="text-text-muted text-sm">{action.description}</span>
            </span>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}
