import { useEffect, useState } from 'react';
import { clamp, easeInOut, lerp } from '@/features/landing/lib/scene-math';

/**
 * A number that counts from `from` to `to` once `start` turns true.
 *
 * It holds `to` until then — not `from` — so a reader whose browser never
 * reports the block in view (no observer, reduced motion) sees the real figure
 * rather than a zero that never moves.
 */
export function useCountUp(to: number, start: boolean, { from = 0, ms = 1300 } = {}): number {
  const [value, setValue] = useState(to);

  useEffect(() => {
    if (!start) {
      setValue(to);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const step = (now: number): void => {
      const t = clamp((now - t0) / ms);
      setValue(Math.round(lerp(from, to, easeInOut(t))));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to, start, from, ms]);

  return value;
}
