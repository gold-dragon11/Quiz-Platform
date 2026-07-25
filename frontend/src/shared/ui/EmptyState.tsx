import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description?: string;
  /** Optional decorative icon/illustration. */
  icon?: ReactNode;
  /** Optional call to action (e.g. a Button or Link). */
  action?: ReactNode;
  className?: string;
}

/**
 * Encouraging placeholder shown when a section has no data yet
 * (docs/07-design/components.md §9, docs/01-prd/dashboard.md §10). Keeps the
 * layout balanced instead of leaving an empty widget.
 */
export function EmptyState({
  title,
  description,
  icon,
  action,
  className = '',
}: EmptyStateProps): React.JSX.Element {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 px-6 py-10 text-center ${className}`}>
      {icon && <div className="text-text-muted">{icon}</div>}
      <div className="flex flex-col gap-1">
        <p className="text-text-primary font-medium">{title}</p>
        {description && <p className="text-text-muted mx-auto max-w-sm text-sm">{description}</p>}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
