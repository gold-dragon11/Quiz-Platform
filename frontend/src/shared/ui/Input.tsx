import { forwardRef, useId } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  /** Neutral guidance shown below the field when there is no error. */
  helperText?: string;
  /** Validation message; when present the field renders in its error state. */
  error?: string;
  /** Optional trailing control (e.g. a password visibility toggle). */
  endAdornment?: ReactNode;
}

/**
 * Text-style input (docs/07-design/components.md §5) supporting label, helper
 * text, validation message, and disabled state. Accessible by construction:
 * the label is associated via `htmlFor`, `aria-invalid`/`aria-describedby`
 * wire the error to assistive tech (§16). Ref-forwarding lets React Hook Form
 * register it directly.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, helperText, error, endAdornment, id, className = '', ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const describedById = `${inputId}-description`;
    const hasError = Boolean(error);

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-text-secondary text-sm font-medium">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            aria-invalid={hasError}
            aria-describedby={error || helperText ? describedById : undefined}
            className={`bg-surface text-text-primary placeholder:text-text-muted h-11 w-full rounded-lg border px-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60 ${
              hasError
                ? 'border-error focus:ring-error'
                : 'border-border focus:border-primary focus:ring-primary'
            } ${endAdornment ? 'pr-11' : ''} ${className}`}
            {...props}
          />
          {endAdornment && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-2">{endAdornment}</div>
          )}
        </div>
        {(error || helperText) && (
          <p id={describedById} className={hasError ? 'text-error text-xs' : 'text-text-muted text-xs'}>
            {error ?? helperText}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';
