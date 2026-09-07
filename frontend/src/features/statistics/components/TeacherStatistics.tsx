import { useQueries } from '@tanstack/react-query';
import { generatePath, Link } from 'react-router-dom';
import { ROUTES } from '@/shared/constants/routes';
import { Alert } from '@/shared/ui/Alert';
import { EmptyState } from '@/shared/ui/EmptyState';
import { FigureGrid } from '@/shared/ui/FigureGrid';
import { Skeleton } from '@/shared/ui/Skeleton';
import { formatPercent, pluralUk } from '@/shared/utils/format';
import { teacherReviewApi } from '@/features/assignments/api/assignments.api';
import { ASSIGNMENT_QUERY_KEYS } from '@/features/assignments/hooks/use-assignments';
import { TopicPerformanceList } from '@/features/assignments/components/TopicPerformanceList';
import type { GroupAnalytics } from '@/features/assignments/types/review.types';
import { useTeacherGroups } from '@/features/groups/hooks/use-groups';
import type { TeacherGroup } from '@/features/groups/types/group.types';

/**
 * Statistics, for somebody who does not sit tests.
 *
 * A teacher used to land on the learner's version — their own level, their own
 * accuracy, their own study time, all of it empty. This answers the question
 * they actually have: where are my groups weak, and what do I set next.
 *
 * There is deliberately no second screen for "gaps" or "revision". The weakest
 * topics *are* the revision plan, and splitting them onto their own page would
 * have produced two screens showing the same numbers — which is exactly what
 * this project just finished untangling on the dashboard.
 */
export function TeacherStatistics(): React.JSX.Element {
  const groups = useTeacherGroups();
  const live = (groups.data ?? []).filter((group) => !group.archivedAt);

  const analytics = useQueries({
    queries: live.map((group) => ({
      queryKey: ASSIGNMENT_QUERY_KEYS.analytics(group.id),
      queryFn: () => teacherReviewApi.groupAnalytics(group.id),
    })),
  });

  if (groups.isPending) {
    return <Skeleton className="h-64" />;
  }

  if (groups.isError) {
    return <Alert variant="error">Не вдалося завантажити групи. Оновіть сторінку.</Alert>;
  }

  if (live.length === 0) {
    return (
      <EmptyState
        title="Активних груп немає"
        description="Статистика зʼявиться, щойно ви створите групу й видасте першу роботу."
        action={
          <Link to={ROUTES.teacherGroups} className="text-primary text-sm underline underline-offset-4">
            До груп
          </Link>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-20">
      {live.map((group, index) => (
        <GroupBlock
          key={group.id}
          group={group}
          data={analytics[index]?.data}
          loading={analytics[index]?.isPending ?? true}
        />
      ))}
    </div>
  );
}

function GroupBlock({
  group,
  data,
  loading,
}: {
  group: TeacherGroup;
  data: GroupAnalytics | undefined;
  loading: boolean;
}): React.JSX.Element {
  return (
    <section>
      <div className="border-border flex items-baseline justify-between gap-4 border-b pb-3">
        <h2 className="text-text-primary font-display text-2xl font-bold">
          <Link
            to={generatePath(ROUTES.teacherGroup, { groupId: group.id })}
            className="hover:text-primary transition-colors"
          >
            {group.name}
          </Link>
        </h2>
        <p className="text-text-muted shrink-0 text-xs tracking-[0.18em] uppercase">{group.subject.name}</p>
      </div>

      {loading ? (
        <Skeleton className="mt-8 h-32" />
      ) : !data ? (
        <p className="text-text-muted mt-8 text-sm">Не вдалося завантажити зведення групи.</p>
      ) : data.assignmentsIssued === 0 ? (
        // Three zeroes and an empty list say less than one sentence.
        <p className="border-border text-text-secondary mt-8 max-w-2xl border-l pl-5 text-sm">
          Роботи ще не видавали, тож рахувати нема чого.{' '}
          <Link
            to={generatePath(ROUTES.teacherAssignmentNew, { groupId: group.id })}
            className="text-primary underline underline-offset-4"
          >
            Видати першу
          </Link>
        </p>
      ) : (
        <>
          <FigureGrid
            className="mt-8"
            figures={[
              { value: data.studentCount, label: pluralUk(data.studentCount, 'учень', 'учні', 'учнів') },
              {
                value: data.assignmentsIssued,
                label: pluralUk(data.assignmentsIssued, 'робота', 'роботи', 'робіт'),
                hint: 'видано',
              },
              {
                value: data.completionRate === null ? '—' : formatPercent(data.completionRate),
                label: 'здано',
                hint: 'частка виданої роботи, що повернулася',
              },
            ]}
          />

          {data.topics.length > 0 ? (
            <div className="mt-12">
              <h3 className="text-text-muted mb-4 text-xs tracking-[0.18em] uppercase">Найслабші теми</h3>
              <TopicPerformanceList topics={data.topics} />
              {/* The action belongs here, next to the evidence for it: the
                  MISTAKES draw builds a paper from exactly these topics. */}
              <Link
                to={generatePath(ROUTES.teacherAssignmentNew, { groupId: group.id })}
                className="text-primary mt-6 inline-block text-sm underline underline-offset-4"
              >
                Видати роботу над цими темами
              </Link>
            </div>
          ) : (
            <p className="text-text-muted mt-8 text-sm">Відповідей поки замало, щоб виділити слабкі теми.</p>
          )}

          <p className="text-text-muted mt-10 text-sm">
            Успішність кожного учня окремо —{' '}
            <Link
              to={generatePath(ROUTES.teacherGroup, { groupId: group.id })}
              className="text-text-secondary underline underline-offset-4"
            >
              на сторінці групи
            </Link>
            .
          </p>
        </>
      )}
    </section>
  );
}
