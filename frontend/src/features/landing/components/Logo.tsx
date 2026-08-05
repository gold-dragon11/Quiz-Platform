interface LogoProps {
  className?: string;
}

/**
 * Wordmark for the landing page — the "L&S" name set inside the primary tile.
 * Slightly larger than the shared app-shell logo, since it anchors the hero.
 * Pure presentation, no asset dependency.
 */
export function Logo({ className = '' }: LogoProps): React.JSX.Element {
  return (
    <span className={`inline-flex items-center ${className}`}>
      <span className="bg-primary flex h-10 items-center justify-center rounded-xl px-3 text-lg font-bold tracking-tight text-white">
        L&amp;S
      </span>
    </span>
  );
}
