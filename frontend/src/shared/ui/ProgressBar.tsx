import { motion } from 'framer-motion';
import { DURATION, EASE } from '@/shared/constants/motion';

interface ProgressBarProps {
  /** Completion in the range 0–100; clamped defensively. */
  value: number;
  /** Accessible label for the bar. */
  label?: string;
  className?: string;
}

/**
 * Horizontal progress indicator (docs/07-design/components.md §11). The fill
 * animates from 0 to `value` on mount using GPU-friendly width easing; motion
 * is centralized (decision F12) and honors reduced-motion app-wide.
 */
export function ProgressBar({ value, label, className = '' }: ProgressBarProps): React.JSX.Element {
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={`bg-surface-elevated h-2 w-full overflow-hidden rounded-full ${className}`}
    >
      <motion.div
        className="bg-primary h-full rounded-full"
        initial={{ width: 0 }}
        animate={{ width: `${clamped}%` }}
        transition={{ duration: DURATION.slow, ease: EASE.out }}
      />
    </div>
  );
}
