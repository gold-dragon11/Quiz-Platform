import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ROUTES } from '@/shared/constants/routes';
import { TRANSITION } from '@/shared/constants/motion';
import { Logo } from '@/shared/ui/Logo';
import { Avatar } from '@/shared/ui/Avatar';
import { Button } from '@/shared/ui/Button';
import { useLogout } from '@/shared/hooks/use-logout';
import { NavList } from '@/shared/layouts/navigation/NavList';
import { NAV_ITEMS, visibleNavItems } from '@/shared/layouts/navigation/nav-items';

interface MobileMenuProps {
  open: boolean;
  onClose: () => void;
  isAdmin: boolean;
  displayName: string;
  username?: string;
  avatarUrl?: string;
}

/** Slide-out navigation drawer for mobile (opened by the header hamburger). */
export function MobileMenu({
  open,
  onClose,
  isAdmin,
  displayName,
  username,
  avatarUrl,
}: MobileMenuProps): React.JSX.Element {
  const { logout, isPending } = useLogout();

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="lg:hidden">
          <motion.div
            className="fixed inset-0 z-40 bg-black/60"
            aria-hidden="true"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={TRANSITION.fade}
          />
          <motion.aside
            className="bg-surface border-border fixed inset-y-0 left-0 z-50 flex w-72 flex-col gap-6 border-r p-4"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={TRANSITION.page}
          >
            <div className="flex items-center justify-between">
              <Link to={ROUTES.dashboard} onClick={onClose}>
                <Logo />
              </Link>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close menu"
                className="text-text-muted hover:text-text-primary rounded p-1"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <NavList
                items={visibleNavItems(NAV_ITEMS, isAdmin)}
                layoutId="mobile-active"
                onNavigate={onClose}
              />
            </div>

            <div className="border-border flex flex-col gap-3 border-t pt-4">
              <div className="flex items-center gap-3">
                <Avatar size="sm" imageUrl={avatarUrl} fallback={displayName.charAt(0)} />
                <div className="flex min-w-0 flex-col">
                  <span className="text-text-primary truncate text-sm font-medium">{displayName}</span>
                  {username && <span className="text-text-muted truncate text-xs">@{username}</span>}
                </div>
              </div>
              <Button
                variant="ghost"
                fullWidth
                isLoading={isPending}
                onClick={() => void logout()}
                className="justify-start"
              >
                Log out
              </Button>
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
