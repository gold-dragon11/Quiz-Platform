import type { ReactNode } from 'react';

interface SectionHeaderProps {
  title: string;
  description?: string;
  /** Optional trailing control, e.g. a "Переглянути всі" link. */
  action?: ReactNode;
  className?: string;
}

/**
 * Consistent heading for a dashboard/page section: a title, an optional
 * description, and an optional trailing action. Establishes the vertical
 * rhythm the design system calls for (docs/07-design/design-system.md §12).
 */
export function SectionHeader({
  title,
  description,
  action,
  className = '',
}: SectionHeaderProps): React.JSX.Element {
  return (
    <div className={`mb-4 flex items-end justify-between gap-4 ${className}`}>
      <div className="flex flex-col gap-1">
        <h2 className="text-text-primary text-lg font-semibold">{title}</h2>
        {description && <p className="text-text-muted text-sm">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
