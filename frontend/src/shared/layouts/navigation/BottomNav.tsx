import { motion } from 'framer-motion';
import { NavLink } from 'react-router-dom';
import { TRANSITION } from '@/shared/constants/motion';
import { BOTTOM_NAV_ITEMS } from '@/shared/layouts/navigation/nav-items';

/**
 * Mobile-only bottom navigation with a floating active indicator. Hidden on
 * large screens where the sidebar takes over.
 */
export function BottomNav(): React.JSX.Element {
  return (
    <nav className="border-border bg-background/95 fixed inset-x-0 bottom-0 z-30 border-t backdrop-blur lg:hidden">
      <div className="flex">
        {BOTTOM_NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            // `min-w-0` keeps every slot the same width: without it a long
            // label sets the item's minimum width and unbalances the bar.
            className="relative flex min-w-0 flex-1 flex-col items-center gap-1 py-2 outline-none"
          >
            {({ isActive }) => (
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
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
