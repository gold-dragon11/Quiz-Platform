import { useEffect, useRef, type RefObject } from 'react';
import { clamp, fractionalIndex, timelineAt } from '@/features/landing/lib/scene-math';
import type { SceneMode } from '@/features/landing/hooks/use-scene-mode';
import { NAV_PX } from '@/features/landing/constants';

interface ScrollSceneOptions {
  mode: SceneMode;
  /** The section: pinned scenes measure their progress through it. */
  sectionRef: RefObject<HTMLElement | null>;
  /** The scene itself: on a phone the list is read just below it. */
  sceneRef: RefObject<HTMLElement | null>;
  /** The list items that pick the frame on a phone. */
  itemSelector: string;
  /** Where each item's frame sits on the timeline. */
  frames: readonly number[];
  /**
   * Called on every animation frame the scroll moved, with progress `p` from 0
   * to 1 and the fractional item `f`. Scenes write straight to the DOM here:
   * re-rendering React sixty times a second for a transform would be waste.
   */
  onFrame: (p: number, f: number) => void;
}

/**
 * Drives a scene from the scroll. Nothing happens in `static` mode — the
 * component paints its end frame itself.
 */
export function useScrollScene({
  mode,
  sectionRef,
  sceneRef,
  itemSelector,
  frames,
  onFrame,
}: ScrollSceneOptions): void {
  const frameRef = useRef(onFrame);
  frameRef.current = onFrame;

  useEffect(() => {
    if (mode === 'static') return;
    const section = sectionRef.current;
    if (!section) return;

    let raf = 0;

    const measure = (): void => {
      raf = 0;
      if (mode === 'pinned') {
        const total = section.offsetHeight - (window.innerHeight - NAV_PX);
        const p = total > 0 ? clamp(-section.getBoundingClientRect().top / total) : 0;
        frameRef.current(p, p * (frames.length - 1));
        return;
      }
      // The item being read is the one that has just slid under the scene.
      const below = sceneRef.current?.getBoundingClientRect().bottom ?? 0;
      const tops = Array.from(
        section.querySelectorAll(itemSelector),
        (item) => item.getBoundingClientRect().top,
      );
      const f = fractionalIndex(below + 16, tops);
      frameRef.current(timelineAt(f, frames), f);
    };

    const schedule = (): void => {
      if (!raf) raf = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [mode, sectionRef, sceneRef, itemSelector, frames]);
}
