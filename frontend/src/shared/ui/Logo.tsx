interface LogoProps {
  /** Hide the wordmark, showing only the mark (e.g. collapsed contexts). */
  markOnly?: boolean;
  className?: string;
}

/**
 * Product wordmark — a small primary mark plus the name. Pure presentation,
 * no asset dependency. Shared so the app shell and any public surface use one
 * consistent logo.
 */
export function Logo({ markOnly = false, className = '' }: LogoProps): React.JSX.Element {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span className="bg-primary flex size-8 items-center justify-center rounded-lg text-sm font-bold text-white">
        Q
      </span>
      {!markOnly && <span className="text-text-primary text-lg font-semibold tracking-tight">Quix</span>}
    </span>
  );
}
