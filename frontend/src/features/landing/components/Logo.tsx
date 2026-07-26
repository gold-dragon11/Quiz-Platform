interface LogoProps {
  className?: string;
}

/**
 * Wordmark for the landing page — a small primary mark plus the product name.
 * Pure presentation, no asset dependency.
 */
export function Logo({ className = '' }: LogoProps): React.JSX.Element {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span className="bg-primary flex size-8 items-center justify-center rounded-lg text-sm font-bold text-white">
        Q
      </span>
      <span className="text-text-primary text-lg font-semibold tracking-tight">Quix</span>
    </span>
  );
}
