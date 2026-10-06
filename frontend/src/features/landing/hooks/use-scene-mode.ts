import { useCallback, useSyncExternalStore } from 'react';
import { useReducedMotion } from 'framer-motion';

/** Where the landing's layout turns from one column into two. */
export const WIDE_QUERY = '(min-width: 900px)';

/** Whether a media query matches, kept current as the window changes. */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void): (() => void) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/**
 * How a scroll-driven scene behaves here:
 *
 * - `pinned` — a wide screen: the section holds the scene in place and plays
 *   it over three screens of scroll;
 * - `flow` — a phone: the scene sticks under the bar while the list beside it
 *   scrolls underneath, and the item being read picks the frame;
 * - `static` — reduced motion: the meaningful end frame, nothing moves.
 */
export type SceneMode = 'pinned' | 'flow' | 'static';

export function useSceneMode(): { mode: SceneMode; wide: boolean } {
  const wide = useMediaQuery(WIDE_QUERY);
  const reduced = useReducedMotion() ?? false;
  return { mode: reduced ? 'static' : wide ? 'pinned' : 'flow', wide };
}
