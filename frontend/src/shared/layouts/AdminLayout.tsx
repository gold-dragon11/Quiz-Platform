import { Outlet } from 'react-router-dom';

/**
 * Layout for administrator pages per docs/05-frontend/routing.md, "Admin Layout".
 * Admin Guard enforcement is added in the Authentication phase — this layout
 * only provides the structural chrome.
 */
export function AdminLayout(): React.JSX.Element {
  return (
    <div className="flex min-h-screen flex-col bg-background text-text-primary">
      <header className="border-border border-b px-6 py-4">
        <span className="font-semibold">Quiz Platform — Admin</span>
      </header>
      <main className="flex-1 px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
