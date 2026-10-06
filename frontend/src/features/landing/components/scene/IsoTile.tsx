import { forwardRef, type CSSProperties, type ReactNode } from 'react';

/** Custom properties a slab reads: its size, depth, offset and spine dot. */
export type TileVars = Partial<Record<'--w' | '--h' | '--d' | '--x' | '--y' | '--z' | '--dot', string>>;

interface IsoTileProps {
  /** What is printed on the spine. */
  spine?: ReactNode;
  /** Colour of the dot on the spine. */
  dot?: string;
  /** Outlines the top face in the accent: the sheet the scene is about. */
  active?: boolean;
  className?: string;
  vars?: TileVars;
  /** Extra attributes the scenes switch on, such as `data-float`. */
  data?: Record<`data-${string}`, string | undefined>;
  /** The top face: real interface, set in real text. */
  children?: ReactNode;
}

/**
 * One slab of the page's axonometric drawings: a top face, a lit front (the
 * spine) and a shaded right side, positioned against each other in 3D by the
 * custom properties in landing.css. Text on the faces is live text, so it
 * stays sharp at any angle — which is why the drawings are CSS and not WebGL.
 *
 * Purely decorative: the scenes it builds are labelled as images as a whole.
 */
export const IsoTile = forwardRef<HTMLDivElement, IsoTileProps>(function IsoTile(
  { spine, dot, active, className = '', vars, data, children },
  ref,
) {
  const style = { ...vars, ...(dot ? { '--dot': dot } : {}) } as CSSProperties;

  return (
    <div
      ref={ref}
      className={`lp-tile ${className}`}
      style={style}
      data-active={active ? '' : undefined}
      {...data}
    >
      <div className="lp-tile__right" />
      <div className="lp-tile__front">
        {dot && <i />}
        {spine}
      </div>
      <div className="lp-tile__top">{children}</div>
    </div>
  );
});
