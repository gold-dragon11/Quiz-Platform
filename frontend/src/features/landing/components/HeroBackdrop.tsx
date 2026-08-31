import { DecorCurves } from '@/features/landing/components/DecorCurves';

/**
 * Hero backdrop: a dense weave of the same faint strokes that run behind every
 * other section, over a soft vignette.
 *
 * It used to be a square grid. The grid read as generic template decoration —
 * every dark developer-tool landing page has one — and it fought the headline
 * for the same rectangle. The curves belong to this page specifically, and
 * because they are the page's own language they carry the hero without
 * competing with the type.
 *
 * The vignette stays, but lighter than it was under the grid: it dims the
 * strokes toward the edges so they fade out rather than stopping at the
 * section boundary, and at the old strength it swallowed them whole.
 */
export function HeroBackdrop(): React.JSX.Element {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <DecorCurves set="hero" />
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 95% 80% at 50% 40%, transparent 58%, rgba(11,10,15,0.6) 100%)',
        }}
      />
    </div>
  );
}
