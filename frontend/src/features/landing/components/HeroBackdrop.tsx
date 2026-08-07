/**
 * Hero backdrop: a faint square grid that fades out toward the edges, plus a
 * soft vignette. Replaces the drifting gradient blobs the section used to
 * have — those read as generic template decoration and pulled attention away
 * from the headline.
 *
 * Both layers are pure CSS on a decorative element, so there is nothing to
 * animate, nothing to load, and nothing for a screen reader to announce.
 */
export function HeroBackdrop(): React.JSX.Element {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(255,255,255,0.035) 1px, transparent 1px),' +
            'linear-gradient(to bottom, rgba(255,255,255,0.035) 1px, transparent 1px)',
          backgroundSize: '72px 72px',
          // Keeps the grid legible behind the headline and dissolves it at the
          // edges, so the section has no hard boundary.
          maskImage: 'radial-gradient(ellipse 75% 60% at 50% 42%, #000 30%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 75% 60% at 50% 42%, #000 30%, transparent 100%)',
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 90% 70% at 50% 38%, transparent 45%, rgba(11,10,15,0.85) 100%)',
        }}
      />
    </div>
  );
}
