import katex from 'katex';
import 'katex/dist/katex.min.css';

interface RenderedMathProps {
  children: string;
  className?: string;
}

/**
 * Splits a string on `$…$` and renders each formula with KaTeX.
 *
 * Loaded only through MathText, so KaTeX stays out of every screen that has no
 * math on it.
 *
 * `dangerouslySetInnerHTML` carries **KaTeX's own output**, not user text: the
 * LaTeX source goes through `renderToString`, which escapes what it does not
 * recognise, and `trust` is left at its default `false`, so commands that can
 * emit a URL (`\href`, `\includegraphics`) are refused. The source itself
 * comes from the seed content and the Admin API, where raw HTML is rejected on
 * write.
 *
 * `throwOnError: false` means a malformed formula renders in red rather than
 * blanking the question — a reader can still answer it, and the mistake is
 * visible to whoever wrote it.
 */
export function RenderedMath({ children, className }: RenderedMathProps): React.JSX.Element {
  // Odd indices are the formulas: the split alternates text, math, text, …
  const segments = children.split('$');

  return (
    <span className={className}>
      {segments.map((segment, index) =>
        index % 2 === 1 ? (
          <span
            key={index}
            dangerouslySetInnerHTML={{
              __html: katex.renderToString(segment, {
                throwOnError: false,
                displayMode: false,
              }),
            }}
          />
        ) : (
          <span key={index}>{segment}</span>
        ),
      )}
    </span>
  );
}
