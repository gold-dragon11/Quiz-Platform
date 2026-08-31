export type CurveSet = 'hero' | 'a' | 'b' | 'c';

interface DecorCurvesProps {
  /**
   * Which drawing to use. `hero` is the densest — it carries a section with no
   * other decoration. `a`, `b` and `c` are quieter sets for sections that have
   * text to protect, and they differ from one another so the page does not
   * repeat the same three strokes on every screen.
   */
  set?: CurveSet;
  /** Positioning, flips, and any extra damping. */
  className?: string;
}

/** [path, opacity] pairs, so each set reads as one drawing rather than a list. */
const SETS: Record<CurveSet, [string, number][]> = {
  hero: [
    ['M -120 100 C 300 40, 540 300, 380 660 S 40 920, -180 880', 0.32],
    ['M 1580 20 C 1180 160, 1100 440, 1440 720', 0.26],
    ['M -180 800 C 340 700, 820 840, 1580 540', 0.18],
    ['M 220 -100 C 440 240, 920 200, 1220 -60', 0.22],
    ['M 1520 940 C 1080 840, 940 560, 1240 240', 0.16],
    ['M -60 400 C 280 460, 440 580, 720 960', 0.2],
    ['M 840 980 C 1000 660, 1340 640, 1580 900', 0.14],
    ['M 1580 380 C 1300 340, 1180 200, 1260 -80', 0.12],
    ['M -200 220 C 160 300, 200 620, -60 940', 0.15],
    ['M 480 -80 C 620 260, 560 620, 760 980', 0.1],
    ['M -180 620 C 320 560, 620 760, 1180 620', 0.09],
    ['M 1040 -60 C 1140 240, 1420 300, 1600 180', 0.08],
  ],
  a: [
    ['M -140 60 C 260 140, 420 380, 300 720 S 40 900, -160 940', 0.22],
    ['M 1560 -20 C 1220 200, 1180 520, 1500 780', 0.19],
    ['M -160 880 C 380 760, 900 900, 1580 620', 0.13],
    ['M 380 -80 C 560 200, 980 240, 1160 -40', 0.15],
    ['M 1580 460 C 1340 420, 1240 260, 1320 -60', 0.11],
    ['M -180 480 C 260 520, 520 700, 700 980', 0.14],
    ['M 900 980 C 1020 700, 1300 660, 1600 760', 0.1],
    ['M 60 -80 C 120 240, 40 560, -160 760', 0.12],
    ['M 1600 300 C 1240 240, 1020 60, 960 -80', 0.08],
  ],
  b: [
    ['M 1580 120 C 1180 60, 940 320, 1060 700 S 1400 920, 1600 880', 0.21],
    ['M -140 40 C 220 220, 260 520, -40 760', 0.18],
    ['M 1600 820 C 1060 700, 560 860, -160 560', 0.12],
    ['M 1060 -80 C 880 220, 460 260, 280 -40', 0.15],
    ['M -160 420 C 100 380, 200 240, 120 -60', 0.1],
    ['M 1620 480 C 1280 540, 1080 720, 900 980', 0.13],
    ['M -180 960 C 180 820, 300 600, 240 300', 0.11],
    ['M 480 -80 C 620 200, 900 240, 1180 120', 0.09],
    ['M 640 980 C 700 720, 560 480, 700 220', 0.07],
  ],
  c: [
    ['M -160 300 C 400 120, 1040 460, 1600 220', 0.2],
    ['M -120 640 C 460 880, 1000 480, 1580 700', 0.17],
    ['M 240 -80 C 300 300, 180 620, -140 900', 0.13],
    ['M 1240 -60 C 1180 320, 1320 640, 1580 940', 0.12],
    ['M 700 960 C 760 640, 640 380, 820 -60', 0.09],
    ['M -180 60 C 280 200, 700 120, 1120 300', 0.14],
    ['M 1600 60 C 1300 180, 1160 420, 1240 700', 0.1],
    ['M -160 780 C 300 700, 460 880, 620 980', 0.11],
    ['M 980 -80 C 1040 260, 1420 380, 1620 340', 0.08],
  ],
};

/**
 * Long, faint strokes drifting behind a section. Purely decorative: no
 * animation, no asset, nothing announced to a screen reader, and no pointer
 * target — the curves must never intercept a click meant for the content.
 *
 * Drawn in a 1440x900 box that scales with `slice`, so the strokes keep their
 * shape instead of stretching with the viewport, and `non-scaling-stroke`
 * holds them at a hairline however far the box is scaled up. They enter from
 * the edges and cross rather than run parallel, which is what stops a set from
 * reading as a pattern.
 *
 * Density is spent where there is room for it. The hero, which holds text on
 * one side and the card on the other, takes the strongest strokes; the content
 * sets run text across the full width, so their ceiling stays below the hero's
 * and their faintest strokes go down to 0.07. At full strength the lines cut
 * through the type they sit behind.
 */
export function DecorCurves({ set = 'a', className = '' }: DecorCurvesProps): React.JSX.Element {
  return (
    <svg
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
      viewBox="0 0 1440 900"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <g stroke="var(--color-primary)" strokeWidth={1} fill="none" vectorEffect="non-scaling-stroke">
        {SETS[set].map(([d, opacity]) => (
          <path key={d} d={d} opacity={opacity} />
        ))}
      </g>
    </svg>
  );
}
