import { motion } from 'framer-motion';
import { DURATION, EASE, HOVER_LIFT } from '@/shared/constants/motion';
import { pluralUk } from '@/shared/utils/format';
import { Skeleton } from '@/shared/ui/Skeleton';
import type { PublicSubject } from '@/features/subjects/types/subjects.types';

interface SubjectCardProps {
  subject: PublicSubject;
  /** Number of topics, or null when unknown (still loading / errored). */
  topicCount: number | null;
  topicsLoading: boolean;
  onSelect: () => void;
}

/**
 * A premium subject card (Phase 6.7 §2): icon placeholder, name, description,
 * and topic count. Question count and difficulty are not exposed by the
 * content API at subject level, so they are intentionally omitted. Subtle
 * hover lift (docs/07-design/motion.md §8).
 *
 * The card opens the subject rather than selecting it — the browser replaces
 * the list with that subject's topics — so it carries no pressed state.
 */
export function SubjectCard({
  subject,
  topicCount,
  topicsLoading,
  onSelect,
}: SubjectCardProps): React.JSX.Element {
  return (
    <motion.button
      type="button"
      onClick={onSelect}
      whileHover={HOVER_LIFT}
      transition={{ duration: DURATION.fast, ease: EASE.out }}
      className="border-border bg-surface hover:border-border-subtle focus-visible:ring-primary focus-visible:ring-offset-background flex h-full flex-col gap-3 rounded-xl border p-5 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
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
          `${topicCount} ${pluralUk(topicCount, 'тема', 'теми', 'тем')}`
        ) : (
          'Теми недоступні'
        )}
      </div>
    </motion.button>
  );
}
