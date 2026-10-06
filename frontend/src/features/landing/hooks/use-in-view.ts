import { useEffect, useState, type RefObject } from 'react';

/**
 * Whether an element is on screen.
 *
 * Without `IntersectionObserver` (an old browser, the test environment) the
 * answer is «no», and everything that waits on it shows its final state from
 * the start — the page must be complete without a single observer firing.
 */
export function useInView(ref: RefObject<Element | null>, threshold = 0.35, once = false): boolean {
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
        if (entry.isIntersecting && once) observer.disconnect();
      },
      { threshold },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, threshold, once]);

  return inView;
}

/** Whether the observer is available at all, i.e. whether `useInView` can ever turn true. */
export const canObserve = (): boolean => typeof IntersectionObserver !== 'undefined';
