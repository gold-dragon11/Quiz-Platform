import type { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: ReactNode;
  /** Optional supporting line under the value. */
  hint?: string;
  /** Optional leading icon. */
  icon?: ReactNode;
  className?: string;
}

/**
 * Compact metric tile (docs/07-design/components.md §11 "Statistic Tile") for
 * summarizing a single number — completed quizzes, accuracy, study time, etc.
 * Purely presentational.
 */
export function StatCard({ label, value, hint, icon, className = '' }: StatCardProps): React.JSX.Element {
  return (
    <div className={`bg-surface border-border flex flex-col gap-2 rounded-xl border p-5 ${className}`}>
      <div className="flex items-center gap-2">
        {icon && <span className="text-text-muted">{icon}</span>}
        <span className="text-text-muted text-xs font-medium tracking-wide uppercase">{label}</span>
      </div>
      <span className="text-text-primary text-2xl font-semibold">{value}</span>
      {hint && <span className="text-text-muted text-xs">{hint}</span>}
    </div>
  );
}
