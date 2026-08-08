/**
 * Full-viewport loading state used while route guards resolve the session and
 * while lazy route chunks load (Phase 6.1 decisions F4/F10). Rendering this
 * during the auth store's `loading` status is what prevents a `/login` flash
 * on reload.
 */
export function FullScreenLoader(): React.JSX.Element {
  return (
    <div
      role="status"
      aria-label="Завантаження"
      className="flex min-h-screen items-center justify-center bg-background"
    >
      <div className="border-border border-t-primary size-8 animate-spin rounded-full border-2" />
    </div>
  );
}
