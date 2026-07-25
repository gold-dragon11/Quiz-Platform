import type { PropsWithChildren } from 'react';

export type AlertVariant = 'success' | 'error' | 'info' | 'warning';

interface AlertProps extends PropsWithChildren {
  variant?: AlertVariant;
  title?: string;
  className?: string;
}

const VARIANT_CLASS: Record<AlertVariant, string> = {
  success: 'border-success/40 bg-success/10 text-text-primary',
  error: 'border-error/40 bg-error/10 text-text-primary',
  info: 'border-info/40 bg-info/10 text-text-primary',
  warning: 'border-warning/40 bg-warning/10 text-text-primary',
};

/**
 * Inline, in-context status message (docs/07-design/components.md §9) — used
 * for form-level errors and success confirmations. `role="alert"` on error/
 * warning makes screen readers announce it immediately; success/info are
 * announced politely.
 */
export function Alert({ variant = 'info', title, className = '', children }: AlertProps): React.JSX.Element {
  const assertive = variant === 'error' || variant === 'warning';
  return (
    <div
      role={assertive ? 'alert' : 'status'}
      className={`rounded-lg border px-4 py-3 text-sm ${VARIANT_CLASS[variant]} ${className}`}
    >
      {title && <p className="mb-1 font-semibold">{title}</p>}
      {children}
    </div>
  );
}
