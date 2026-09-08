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
 *
 * Entries arrive grouped by `section` and a hairline is drawn wherever the
 * section changes. Nine links in one undifferentiated column gave «Тест» and
 * «Налаштування» the same weight and left the reader to work out that four of
 * them were things to do and two were about their account; the rules do that
 * work. They are drawn between groups rather than around them for the same
 * reason the rest of the interface uses rules instead of boxes.
 *
 * The separator is computed from the rendered list, after the role filter, so
 * a section that comes back empty for this role leaves no stray line behind.
 */
export function NavList({ items, layoutId, onNavigate }: NavListProps): React.JSX.Element {
  return (
    <nav className="flex flex-col gap-1">
      {items.map((item, index) => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={onNavigate}
          className={`group relative block rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-primary ${
            index > 0 && items[index - 1].section !== item.section ? 'border-border mt-3 border-t pt-3' : ''
          }`}
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
