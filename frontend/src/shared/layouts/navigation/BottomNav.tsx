import { motion } from 'framer-motion';
import { NavLink } from 'react-router-dom';
import { TRANSITION } from '@/shared/constants/motion';
import { BOTTOM_NAV_ITEMS, visibleNavItems } from '@/shared/layouts/navigation/nav-items';
import { useCurrentUser } from '@/shared/hooks/use-current-user';
import { isNavItemActive, useMockSittingOpen } from '@/shared/layouts/navigation/use-mock-sitting';

/**
 * Mobile-only bottom navigation with a floating active indicator. Hidden on
 * large screens where the sidebar takes over.
 */
export function BottomNav(): React.JSX.Element {
  const { data: user } = useCurrentUser();
  const items = visibleNavItems(BOTTOM_NAV_ITEMS, user?.role);
  const mockSitting = useMockSittingOpen();

  return (
    <nav className="border-border bg-background/95 fixed inset-x-0 bottom-0 z-30 border-t backdrop-blur lg:hidden">
      <div className="flex">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            // `min-w-0` keeps every slot the same width: without it a long
            // label sets the item's minimum width and unbalances the bar.
            className="relative flex min-w-0 flex-1 flex-col items-center gap-1 py-2 outline-none"
          >
            {({ isActive: routerActive }) => {
              const isActive = isNavItemActive(item.to, routerActive, mockSitting);
              return (
                <>
                  {isActive && (
                    <motion.span
                      layoutId="bottom-active"
                      transition={TRANSITION.fade}
                      className="bg-primary absolute top-0 h-0.5 w-8 rounded-full"
                    />
                  )}
                  <span className={isActive ? 'text-primary' : 'text-text-muted'}>{item.icon}</span>
                  <span
                    className={`w-full truncate text-center text-[0.625rem] ${
                      isActive ? 'text-text-primary' : 'text-text-muted'
                    }`}
                  >
                    {item.label}
                  </span>
                </>
              );
            }}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
