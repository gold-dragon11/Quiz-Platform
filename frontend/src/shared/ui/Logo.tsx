interface LogoProps {
  /**
   * Kept for API compatibility with collapsed contexts (the sidebar passes it).
   * The mark already carries the full name, so there is no separate wordmark
   * left to hide and the flag no longer changes the output.
   */
  markOnly?: boolean;
  className?: string;
}

/**
 * Product mark — the "L&S" wordmark set inside the primary tile. Pure
 * presentation, no asset dependency. Shared so the app shell and any public
 * surface use one consistent logo.
 */
export function Logo({ className = '' }: LogoProps): React.JSX.Element {
  return (
    <span className={`inline-flex items-center ${className}`}>
      <span className="bg-primary flex h-8 items-center justify-center rounded-lg px-2.5 text-sm font-bold tracking-tight text-white">
        L&amp;S
      </span>
    </span>
  );
}
