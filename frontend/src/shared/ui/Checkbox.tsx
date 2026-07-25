import { forwardRef, useId } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: ReactNode;
}

/**
 * Checkbox with an associated label (docs/07-design/components.md §6).
 * Ref-forwarding lets React Hook Form (or a controlled parent) drive it; the
 * whole label is clickable and keyboard reachable.
 */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, id, className = '', ...props }, ref) => {
    const generatedId = useId();
    const checkboxId = id ?? generatedId;

    return (
      <label htmlFor={checkboxId} className="flex cursor-pointer items-start gap-3 select-none">
        <input
          ref={ref}
          id={checkboxId}
          type="checkbox"
          className={`accent-primary border-border bg-surface mt-0.5 size-4 shrink-0 rounded outline-none focus-visible:ring-2 focus-visible:ring-primary ${className}`}
          {...props}
        />
        <span className="text-text-secondary text-sm">{label}</span>
      </label>
    );
  },
);

Checkbox.displayName = 'Checkbox';
