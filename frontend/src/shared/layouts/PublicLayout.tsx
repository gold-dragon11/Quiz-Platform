import { Outlet } from 'react-router-dom';

/**
 * Layout for unauthenticated pages (login, register, password recovery, etc.)
 * per docs/05-frontend/routing.md, "Public Layout".
 */
export function PublicLayout(): React.JSX.Element {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Outlet />
    </div>
  );
}
