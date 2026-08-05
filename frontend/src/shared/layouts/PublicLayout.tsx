import { Outlet } from 'react-router-dom';
import { LanguageSwitcher } from '@/shared/ui/LanguageSwitcher';

/**
 * Layout for unauthenticated pages (login, register, password recovery, etc.)
 * per docs/05-frontend/routing.md, "Public Layout". The language switcher is
 * pinned to the top-right corner so a visitor can change the interface
 * language before they have an account to store a preference on.
 */
export function PublicLayout(): React.JSX.Element {
  return (
    <div className="bg-background relative flex min-h-screen items-center justify-center px-4">
      <div className="absolute top-5 right-5 z-20 sm:top-6 sm:right-8">
        <LanguageSwitcher />
      </div>
      <Outlet />
    </div>
  );
}
