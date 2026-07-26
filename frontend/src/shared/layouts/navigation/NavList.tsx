import { motion } from 'framer-motion';
import { NavLink } from 'react-router-dom';
import { TRANSITION } from '@/shared/constants/motion';
import type { NavItem } from '@/shared/layouts/navigation/nav-items';

interface NavListProps {
  items: NavItem[];
  /** Unique per instance so the sliding indicator doesn't cross-animate. */
  layoutId: string;
  /** Called after a link is chosen (e.g. to close the mobile menu). */
  onNavigate?: () => void;
}

/**
 * Vertical navigation list with an animated active indicator (a shared
 * `layoutId` element that slides between the active item) and a subtle hover
 * state. Uses NavLink so nested routes (e.g. /quiz/:id) keep their parent
 * highlighted.
 */
export function NavList({ items, layoutId, onNavigate }: NavListProps): React.JSX.Element {
  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={onNavigate}
          className="group relative block rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {({ isActive }) => (
            <span className="relative flex items-center gap-3 px-3 py-2.5 text-sm font-medium">
              {isActive && (
                <motion.span
                  layoutId={layoutId}
                  transition={TRANSITION.fade}
                  className="bg-surface-elevated absolute inset-0 rounded-lg"
                />
              )}
              <span
                className={`relative z-10 flex items-center gap-3 transition-colors ${
                  isActive ? 'text-text-primary' : 'text-text-muted group-hover:text-text-secondary'
                }`}
              >
                {item.icon}
                {item.label}
              </span>
            </span>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
