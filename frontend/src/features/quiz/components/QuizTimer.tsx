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
    <div
      role="timer"
      aria-live="off"
      className={`rounded-lg border px-3 py-1.5 text-sm font-medium tabular-nums ${
        low
          ? 'border-error/40 bg-error/10 text-error'
          : 'border-border bg-surface-elevated text-text-secondary'
      }`}
    >
      {formatCountdown(remaining)}
    </div>
  );
}
