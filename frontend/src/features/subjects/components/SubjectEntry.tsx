import { Skeleton } from '@/shared/ui/Skeleton';
import { pluralUk } from '@/shared/utils/format';
import type { PublicSubject, PublicTopic } from '@/features/subjects/types/subjects.types';

interface SubjectEntryProps {
  subject: PublicSubject;
  /** The topics to print — all of them, or only those matching a search. */
  topics: PublicTopic[];
  /** How many the subject has in total, for the count on the right. */
  topicCount: number;
  topicsPending: boolean;
  /** True when a search narrowed the printed run to a subset. */
  filtered: boolean;
  onOpen: () => void;
}

/**
 * One subject, set as an entry in a table of contents.
 *
 * The card this replaced carried a coloured initial in a rounded square, the
 * name, a clamped description and «18 тем» — four elements arranged so that
 * the only one a reader could act on, the topic names, was the one it did not
 * show. Here the names are the body of the entry, and the count keeps its
 * place on the right where it reads as a page number.
 *
 * `subject.color`/`subject.icon` are deliberately unused: a per-subject accent
 * is what turns four entries into four differently-branded boxes, and the
 * headings already separate them.
 */
export function SubjectEntry({
  subject,
  topics,
  topicCount,
  topicsPending,
  filtered,
  onOpen,
}: SubjectEntryProps): React.JSX.Element {
  return (
    <li className="border-border border-b">
      <button
        type="button"
        onClick={onOpen}
        className="focus-visible:ring-primary focus-visible:ring-offset-background group w-full py-8 text-left outline-none focus-visible:ring-2 focus-visible:ring-offset-4"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2">
          <h2 className="text-text-primary group-hover:text-primary font-display text-3xl font-bold transition-colors sm:text-4xl">
            {subject.name}
          </h2>
          {topicsPending ? (
            <Skeleton className="h-4 w-20" />
          ) : (
            <p className="text-text-muted shrink-0 text-sm lining-nums">
              {topicCount} {pluralUk(topicCount, 'тема', 'теми', 'тем')}
            </p>
          )}
        </div>

        {subject.description && (
          <p className="text-text-secondary mt-3 max-w-2xl text-sm">{subject.description}</p>
        )}

        {/* Topic names run as one paragraph separated by middots — a contents
            page, not a bullet list. A list would have turned every subject
            into its own column and brought the grid back. */}
        {topics.length > 0 && (
          <p className="text-text-muted mt-4 text-sm leading-relaxed">
            {filtered && <span className="tracking-[0.18em] uppercase">збіги: </span>}
            {topics.map((topic) => topic.name).join(' · ')}
          </p>
        )}
      </button>
    </li>
  );
}
