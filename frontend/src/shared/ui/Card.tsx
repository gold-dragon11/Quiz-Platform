import type { PropsWithChildren } from 'react';

interface CardProps extends PropsWithChildren {
  className?: string;
}

/**
 * Primary content container (docs/07-design/components.md §7). A neutral
 * elevated surface; headers, footers, and actions are composed as children.
 */
export function Card({ className = '', children }: CardProps): React.JSX.Element {
  return (
    <div className={`bg-surface border-border rounded-xl border p-6 shadow-lg ${className}`}>{children}</div>
  );
}
