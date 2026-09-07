import { Alert } from '@/shared/ui/Alert';
import { FigureGrid } from '@/shared/ui/FigureGrid';
import { Skeleton } from '@/shared/ui/Skeleton';
import { formatPercent } from '@/shared/utils/format';
import { TopicPerformanceList } from '@/features/assignments/components/TopicPerformanceList';
import { useGroupAnalytics } from '@/features/assignments/hooks/use-assignments';

/**
 * Where the group stands, as a section of the group's own page rather than a
 * screen of its own.
 *
 * A separate analytics page would be one more thing to remember to open. These
 * are three numbers and a list of topics; they belong under the roster they
 * describe.
 */
export function GroupAnalyticsSection({ groupId }: { groupId: string }): React.JSX.Element {
  const analytics = useGroupAnalytics(groupId);

  if (analytics.isPending) {
    return <Skeleton className="mt-16 h-40" />;
  }

  if (analytics.isError) {
    return (
      <Alert variant="error" className="mt-16">
        Не вдалося завантажити зведення групи.
      </Alert>
    );
  }

  const { studentCount, assignmentsIssued, completionRate, topics } = analytics.data;

  // Nothing has been issued yet: three zeroes and an empty list say less than
  // one sentence, and this section would be the first thing a new group shows.
  if (assignmentsIssued === 0) {
    return <></>;
  }

  return (
    <section className="mt-16">
      <h2 className="text-text-muted mb-6 text-xs tracking-[0.18em] uppercase">Як іде група</h2>

      <FigureGrid
        figures={[
          { value: studentCount, label: 'учнів' },
          { value: assignmentsIssued, label: 'завдань видано' },
          {
            value: completionRate === null ? '—' : formatPercent(completionRate),
            label: 'здано вчасно чи пізніше',
            hint: 'частка виданої роботи, що повернулася',
          },
        ]}
      />

      {topics.length > 0 && (
        <div className="mt-12">
          <h3 className="text-text-muted mb-4 text-xs tracking-[0.18em] uppercase">Теми, від найслабшої</h3>
          <TopicPerformanceList topics={topics} />
        </div>
      )}
    </section>
  );
}
