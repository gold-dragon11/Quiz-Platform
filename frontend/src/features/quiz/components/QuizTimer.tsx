import { useEffect, useRef, useState } from 'react';
import { formatCountdown } from '@/features/quiz/lib/quiz-answers';

interface QuizTimerProps {
  /** ISO deadline from the session metadata. */
  expiresAt: string;
  /** Fired once when the countdown reaches zero. */
  onExpire: () => void;
}

function secondsUntil(iso: string): number {
  return Math.max(0, Math.round((new Date(iso).getTime() - Date.now()) / 1000));
}

/**
 * Countdown for timed sessions (docs/04-api/quiz.md §11). The backend owns the
 * real deadline and auto-completes expired sessions; this only displays the
 * remaining time and signals expiry once so the page can finalize.
 *
 * Set as a figure with a label under it, like every other number in the
 * interface, rather than as a tinted pill — the pill made the clock compete
 * with the question for attention at every moment except the one where it
 * matters. It turns red under thirty seconds, which is that moment.
 */
export function QuizTimer({ expiresAt, onExpire }: QuizTimerProps): React.JSX.Element {
  const [remaining, setRemaining] = useState(() => secondsUntil(expiresAt));
  const firedRef = useRef(false);

  useEffect(() => {
    const tick = (): void => {
      const next = secondsUntil(expiresAt);
      setRemaining(next);
      if (next <= 0 && !firedRef.current) {
        firedRef.current = true;
        onExpire();
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, onExpire]);

  const low = remaining <= 30;

  return (
    <div role="timer" aria-live="off" className="shrink-0 text-right">
      <p
        className={`font-display text-2xl leading-none font-bold tabular-nums ${
          low ? 'text-error' : 'text-text-primary'
        }`}
      >
        {formatCountdown(remaining)}
      </p>
      <p className="text-text-muted mt-1.5 text-xs tracking-[0.18em] uppercase">лишилось</p>
    </div>
  );
}
