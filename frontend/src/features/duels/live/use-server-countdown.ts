import { useEffect, useState } from 'react';
import { serverNow } from '@/features/duels/live/live-client';

/**
 * Milliseconds left until a server deadline, on the server's clock.
 *
 * The deadline comes from the server as its own epoch time; a phone whose
 * clock runs a few seconds off would otherwise show a question closing early
 * or late. Ticks ten times a second — a ten-second question needs a bar that
 * moves smoothly, not in jumps.
 */
export function useServerCountdown(deadline: number | null): number {
  const [left, setLeft] = useState(() => (deadline === null ? 0 : Math.max(0, deadline - serverNow())));

  useEffect(() => {
    if (deadline === null) {
      setLeft(0);
      return;
    }
    const tick = (): void => setLeft(Math.max(0, deadline - serverNow()));
    tick();
    const interval = setInterval(tick, 100);
    return () => clearInterval(interval);
  }, [deadline]);

  return left;
}
