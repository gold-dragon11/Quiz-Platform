interface LogoProps {
  /**
   * `lg` anchors the top of the hero; `md` is the quieter footer mark.
   */
  size?: 'md' | 'lg';
  className?: string;
}

const SIZE_CLASS: Record<'md' | 'lg', string> = {
  md: 'h-10 rounded-xl px-3 text-lg',
  // Steps down on narrow screens so it does not crowd the language switcher,
  // which sits on the same row in the top-right corner.
  lg: 'h-12 rounded-xl px-4 text-xl sm:h-14 sm:rounded-2xl sm:px-5 sm:text-2xl',
};

/**
 * Wordmark for the landing page — the "L&S" name set inside the primary tile.
 * Pure presentation, no asset dependency.
 */
export function Logo({ size = 'md', className = '' }: LogoProps): React.JSX.Element {
  return (
    <span className={`inline-flex items-center ${className}`}>
      <span
        className={`bg-primary flex items-center justify-center font-extrabold tracking-tight text-white ${SIZE_CLASS[size]}`}
      >
        L&amp;S
      </span>
    </span>
  );
}
