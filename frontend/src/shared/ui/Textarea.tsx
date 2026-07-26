import { forwardRef, useId } from 'react';
import type { TextareaHTMLAttributes } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
  error?: string;
}

/**
 * Multi-line text input (docs/07-design/components.md §5). Mirrors Input's
 * label/helper/error contract and accessibility wiring; ref-forwarding lets
 * React Hook Form register it directly.
 */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, helperText, error, id, rows = 4, className = '', ...props }, ref) => {
    const generatedId = useId();
    const textareaId = id ?? generatedId;
    const describedById = `${textareaId}-description`;
    const hasError = Boolean(error);

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={textareaId} className="text-text-secondary text-sm font-medium">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          aria-invalid={hasError}
          aria-describedby={error || helperText ? describedById : undefined}
          className={`bg-surface text-text-primary placeholder:text-text-muted w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60 ${
            hasError
              ? 'border-error focus:ring-error'
              : 'border-border focus:border-primary focus:ring-primary'
          } ${className}`}
          {...props}
        />
        {(error || helperText) && (
          <p id={describedById} className={hasError ? 'text-error text-xs' : 'text-text-muted text-xs'}>
            {error ?? helperText}
          </p>
        )}
      </div>
    );
  },
);

Textarea.displayName = 'Textarea';
