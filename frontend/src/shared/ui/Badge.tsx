import type { PropsWithChildren } from 'react';

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'error' | 'info';

interface BadgeProps extends PropsWithChildren {
  tone?: BadgeTone;
  className?: string;
}

const TONE_CLASS: Record<BadgeTone, string> = {
  neutral: 'bg-surface-elevated text-text-secondary border-border',
  success: 'bg-success/10 text-success border-success/30',
  warning: 'bg-warning/10 text-warning border-warning/30',
  error: 'bg-error/10 text-error border-error/30',
  info: 'bg-info/10 text-info border-info/30',
};

/**
 * Small status pill (docs/07-design/components.md §11) for account status,
 * verification state, and similar short labels.
 */
export function Badge({ tone = 'neutral', className = '', children }: BadgeProps): React.JSX.Element {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${TONE_CLASS[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
