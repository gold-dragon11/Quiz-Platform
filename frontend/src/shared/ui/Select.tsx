import { forwardRef, useId } from 'react';
import type { SelectHTMLAttributes } from 'react';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  helperText?: string;
  error?: string;
  options: SelectOption[];
}

/**
 * Select dropdown (docs/07-design/components.md §6). Mirrors Input's
 * label/helper/error contract and accessibility wiring; ref-forwarding lets
 * React Hook Form register it directly.
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, helperText, error, options, id, className = '', ...props }, ref) => {
    const generatedId = useId();
    const selectId = id ?? generatedId;
    const describedById = `${selectId}-description`;
    const hasError = Boolean(error);

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={selectId} className="text-text-secondary text-sm font-medium">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          aria-invalid={hasError}
          aria-describedby={error || helperText ? describedById : undefined}
          className={`bg-surface text-text-primary h-11 w-full rounded-lg border px-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60 ${
            hasError
              ? 'border-error focus:ring-error'
              : 'border-border focus:border-primary focus:ring-primary'
          } ${className}`}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {(error || helperText) && (
          <p id={describedById} className={hasError ? 'text-error text-xs' : 'text-text-muted text-xs'}>
            {error ?? helperText}
          </p>
        )}
      </div>
    );
  },
);

Select.displayName = 'Select';
