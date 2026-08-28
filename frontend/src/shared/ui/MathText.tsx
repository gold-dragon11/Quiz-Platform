import { Suspense, lazy } from 'react';

const RenderedMath = lazy(() =>
  import('@/shared/ui/RenderedMath').then((m) => ({ default: m.RenderedMath })),
);

interface MathTextProps {
  /** Text that may contain LaTeX between `$…$`. */
  children: string;
  className?: string;
}

/**
 * Text with inline LaTeX, as questions and answer options carry it.
 *
 * Most strings on the platform contain no math at all — every question in
 * history, Ukrainian, and English, and the prose parts of mathematics — so the
 * common case must cost nothing. A string with no `$` is returned as plain
 * text and KaTeX is never loaded; only a string that actually contains math
 * pulls in the renderer chunk.
 *
 * While that chunk loads, the delimiters are stripped and the LaTeX shown as
 * text. It is a moment, and it keeps the line from collapsing to nothing.
 */
export function MathText({ children, className }: MathTextProps): React.JSX.Element {
  if (!children.includes('$')) {
    return <span className={className}>{children}</span>;
  }

  return (
    <Suspense fallback={<span className={className}>{children.replaceAll('$', '')}</span>}>
      <RenderedMath className={className}>{children}</RenderedMath>
    </Suspense>
  );
}
