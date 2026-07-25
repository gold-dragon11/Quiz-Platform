interface ServerErrorPageProps {
  title?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

/**
 * Generic error surface (Phase 6.1 decision F7). Reused by two of the four
 * error layers: the top-level React error boundary (AppErrorBoundary) and the
 * router's error element (RouteError). Kept presentational and dependency-free
 * so it can render even when app providers have failed.
 */
export function ServerErrorPage({
  title = 'Something went wrong',
  message = 'An unexpected error occurred. Please try again.',
  actionLabel = 'Try again',
  onAction,
}: ServerErrorPageProps): React.JSX.Element {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
      <h1 className="text-text-primary text-3xl font-semibold">{title}</h1>
      <p className="text-text-muted max-w-md">{message}</p>
      {onAction && (
        <button
          type="button"
          onClick={onAction}
          className="bg-primary hover:bg-primary-hover rounded-md px-4 py-2 text-sm font-medium text-white transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
