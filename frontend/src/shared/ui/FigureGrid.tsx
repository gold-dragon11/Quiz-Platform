import type { ReactNode } from 'react';

export interface Figure {
  value: ReactNode;
  label: string;
  /** Optional line under the label, for what the number actually counts. */
  hint?: string;
}

interface FigureGridProps {
  figures: Figure[];
  className?: string;
}

/**
 * A row of numbers, ruled rather than boxed.
 *
 * The boxed-tile version of this — every metric in its own bordered card with
 * the same padding and the same radius — is the single most recognisable
 * marker of an interface nobody designed. Hairlines and whitespace carry the
 * same grouping with none of the visual noise, and let the figures themselves
 * be the largest thing on the screen.
 *
 * The figure is ordered above its label in the DOM, not reversed out of a
 * column: reversing packs each cell from the bottom, which lifts the number in
 * any column whose label runs to two lines. Lining figures because Playfair's
 * defaults are old-style — 3 and 4 drop below the baseline, 0 sits at
 * x-height — and a row of numbers has to share one baseline.
 */
export function FigureGrid({ figures, className = '' }: FigureGridProps): React.JSX.Element {
  return (
    <dl
      className={`border-border grid border-y ${figures.length > 2 ? 'grid-cols-3' : 'grid-cols-2'} ${className}`}
    >
      {figures.map((figure) => (
        <div
          key={figure.label}
          className="border-border flex flex-col px-4 py-8 first:border-l-0 first:pl-0 sm:border-l sm:px-8"
        >
          <dd className="text-text-primary font-display order-1 text-4xl font-bold lining-nums sm:text-5xl">
            {figure.value}
          </dd>
          <dt className="text-text-muted order-2 mt-3 text-xs tracking-[0.18em] uppercase">{figure.label}</dt>
          {figure.hint && <p className="text-text-muted order-3 mt-2 text-xs">{figure.hint}</p>}
        </div>
      ))}
    </dl>
  );
}
