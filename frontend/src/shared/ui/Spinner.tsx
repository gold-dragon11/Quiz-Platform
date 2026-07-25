interface SpinnerProps {
  /** Extra classes for sizing/color (defaults to `size-4` inheriting color). */
  className?: string;
}

/**
 * Inline loading spinner (docs/07-design/components.md §9). Inherits the
 * current text color via `border-current`, so it adapts to whatever button or
 * surface it sits in. Decorative — labelling is the caller's responsibility.
 */
export function Spinner({ className = 'size-4' }: SpinnerProps): React.JSX.Element {
  return (
    <span
      aria-hidden="true"
      className={`inline-block animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
    />
  );
}
