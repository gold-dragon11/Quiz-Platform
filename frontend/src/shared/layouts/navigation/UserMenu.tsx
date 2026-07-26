import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ROUTES } from '@/shared/constants/routes';
import { dropdownMenu, TRANSITION } from '@/shared/constants/motion';
import { Avatar } from '@/shared/ui/Avatar';
import { useLogout } from '@/shared/hooks/use-logout';

interface UserMenuProps {
  isAdmin: boolean;
  displayName: string;
  username?: string;
  avatarUrl?: string;
}

/** Header user dropdown: profile, settings, admin (admins only), and logout. */
export function UserMenu({ isAdmin, displayName, username, avatarUrl }: UserMenuProps): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { logout } = useLogout();

  useEffect(() => {
    if (!open) {
      return;
    }
    const onPointerDown = (event: MouseEvent): void => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const close = (): void => setOpen(false);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-lg p-1 outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <Avatar size="sm" imageUrl={avatarUrl} fallback={displayName.charAt(0)} />
        <span className="text-text-secondary hidden text-sm font-medium sm:block">{displayName}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            variants={dropdownMenu}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={TRANSITION.fade}
            className="bg-surface border-border absolute right-0 z-50 mt-2 w-56 origin-top-right overflow-hidden rounded-xl border shadow-xl"
          >
            <div className="border-border border-b px-4 py-3">
              <p className="text-text-primary truncate text-sm font-medium">{displayName}</p>
              {username && <p className="text-text-muted truncate text-xs">@{username}</p>}
            </div>
            <div className="flex flex-col py-1">
              <MenuLink to={ROUTES.profile} onClick={close}>
                Profile
              </MenuLink>
              <MenuLink to={ROUTES.settings} onClick={close}>
                Settings
              </MenuLink>
              {isAdmin && (
                <MenuLink to={ROUTES.admin} onClick={close}>
                  Admin
                </MenuLink>
              )}
            </div>
            <div className="border-border border-t py-1">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  close();
                  void logout();
                }}
                className="text-text-secondary hover:bg-surface-elevated hover:text-text-primary w-full px-4 py-2 text-left text-sm"
              >
                Log out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MenuLink({
  to,
  onClick,
  children,
}: {
  to: string;
  onClick: () => void;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <Link
      to={to}
      role="menuitem"
      onClick={onClick}
      className="text-text-secondary hover:bg-surface-elevated hover:text-text-primary px-4 py-2 text-sm"
    >
      {children}
    </Link>
  );
}
