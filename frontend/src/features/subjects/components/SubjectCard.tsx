import { motion } from 'framer-motion';
import { DURATION, EASE, HOVER_LIFT } from '@/shared/constants/motion';
import { Skeleton } from '@/shared/ui/Skeleton';
import type { PublicSubject } from '@/features/subjects/types/subjects.types';

interface SubjectCardProps {
  subject: PublicSubject;
  /** Number of topics, or null when unknown (still loading / errored). */
  topicCount: number | null;
  topicsLoading: boolean;
  selected: boolean;
  onSelect: () => void;
}

/**
 * A premium, selectable subject card (Phase 6.7 §2): icon placeholder, name,
 * description, and topic count. Question count and difficulty are not exposed
 * by the content API at subject level, so they are intentionally omitted.
 * Subtle hover lift (docs/07-design/motion.md §8).
 */
export function SubjectCard({
  subject,
  topicCount,
  topicsLoading,
  selected,
  onSelect,
}: SubjectCardProps): React.JSX.Element {
  return (
    <motion.button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      whileHover={HOVER_LIFT}
      transition={{ duration: DURATION.fast, ease: EASE.out }}
      className={`flex h-full flex-col gap-3 rounded-xl border p-5 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
        selected ? 'border-primary bg-primary/5' : 'border-border bg-surface hover:border-border-subtle'
      }`}
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="bg-surface-elevated flex size-11 shrink-0 items-center justify-center rounded-lg text-lg font-semibold"
          style={{ color: subject.color ?? undefined }}
        >
          {subject.icon || subject.name.charAt(0).toUpperCase()}
        </span>
        <h3 className="text-text-primary truncate font-medium">{subject.name}</h3>
      </div>

      {subject.description && <p className="text-text-muted line-clamp-2 text-sm">{subject.description}</p>}

      <div className="text-text-muted mt-auto pt-1 text-xs">
        {topicsLoading ? (
          <Skeleton className="h-3 w-16" />
        ) : topicCount !== null ? (
          `${topicCount} ${topicCount === 1 ? 'topic' : 'topics'}`
        ) : (
          'Теми недоступні'
        )}
      </div>
    </motion.button>
  );
}
