interface ArrowIconProps {
  /** `right` sits inside a button; `down` marks the scroll link in the hero. */
  direction?: 'right' | 'down';
  className?: string;
}

/**
 * The one glyph the landing needs beyond text. Drawn rather than typed: the
 * arrow characters are outside Manrope's subsets, so a literal → would fall
 * back to a system face and sit at the wrong weight beside the label.
 *
 * `currentColor` throughout, so it inherits whatever the label is set in.
 */
export function ArrowIcon({ direction = 'right', className = '' }: ArrowIconProps): React.JSX.Element {
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {direction === 'right' ? (
        <>
          <path d="M5 12h14" />
          <path d="m12 5 7 7-7 7" />
        </>
      ) : (
        <>
          <path d="M12 5v14" />
          <path d="m5 12 7 7 7-7" />
        </>
      )}
    </svg>
  );
}
