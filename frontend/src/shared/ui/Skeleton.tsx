interface SkeletonProps {
  /** Tailwind sizing/shape classes for the placeholder block. */
  className?: string;
}

/**
 * Neutral loading placeholder (Phase 6.1 decision F10). TanStack Query loading
 * states render skeletons rather than spinners; compose several of these to
 * mirror the shape of the content being loaded. Purely presentational.
 */
export function Skeleton({ className = '' }: SkeletonProps): React.JSX.Element {
  return <div aria-hidden="true" className={`bg-surface-elevated animate-pulse rounded-md ${className}`} />;
}
