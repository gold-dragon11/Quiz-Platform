import { useQueries } from '@tanstack/react-query';
import { generatePath, Link } from 'react-router-dom';
import { ROUTES } from '@/shared/constants/routes';
import { Alert } from '@/shared/ui/Alert';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Skeleton } from '@/shared/ui/Skeleton';
import { formatShortDate, pluralUk } from '@/shared/utils/format';
import { teacherAssignmentsApi } from '@/features/assignments/api/assignments.api';
import { ASSIGNMENT_QUERY_KEYS } from '@/features/assignments/hooks/use-assignments';
import type { TeacherAssignment } from '@/features/assignments/types/assignment.types';
import { useTeacherGroups } from '@/features/groups/hooks/use-groups';
import type { TeacherGroup } from '@/features/groups/types/group.types';

/**
 * A teacher's home: their groups, and what each one owes them.
 *
 * A teacher used to land on the learner's dashboard — their own level, their
 * own XP, their own progress per subject, all of it zero, because a teacher
 * does not sit tests. One route, two entirely different jobs; the role picks.
 *
 * Each group's newest assignment is fetched alongside it. That is one request
 * per group, which is fine at the scale a tutor works at and wrong at the
 * scale a school does — if this ever needs to serve fifty groups, the honest
 * fix is an endpoint that answers it in one, not a spinner here.
 */
export function TeacherOverview(): React.JSX.Element {
  const groups = useTeacherGroups();
  const live = (groups.data ?? []).filter((group) => !group.archivedAt);

  const assignmentQueries = useQueries({
    queries: live.map((group) => ({
      queryKey: ASSIGNMENT_QUERY_KEYS.forGroup(group.id),
      queryFn: () => teacherAssignmentsApi.listForGroup(group.id),
    })),
  });

  if (groups.isPending) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    );
  }

  if (groups.isError) {
    return <Alert variant="error">Не вдалося завантажити групи. Оновіть сторінку.</Alert>;
  }

  if (live.length === 0) {
    return (
      <EmptyState
        title="Активних груп немає"
        description="Створіть групу, поділіться кодом — далі можна видавати роботу й бачити, як вона йде."
        action={
          <Link to={ROUTES.teacherGroups} className="text-primary text-sm underline underline-offset-4">
            До груп
          </Link>
        }
      />
    );
  }

  return (
    <ul className="divide-border divide-y">
      {live.map((group, index) => (
        <GroupRow
          key={group.id}
          group={group}
          assignments={assignmentQueries[index]?.data}
          loading={assignmentQueries[index]?.isPending ?? true}
        />
      ))}
    </ul>
  );
}

function GroupRow({
  group,
  assignments,
  loading,
}: {
  group: TeacherGroup;
  assignments: TeacherAssignment[] | undefined;
  loading: boolean;
}): React.JSX.Element {
  // The newest by deadline is the one still in play; older work is history the
  // group page holds.
  const latest = (assignments ?? [])
    .slice()
    .sort((a, b) => new Date(b.dueAt).getTime() - new Date(a.dueAt).getTime())[0];

  const outstanding = latest ? latest.targetCount - latest.submittedCount : 0;
  const overdue = latest ? new Date(latest.dueAt).getTime() < Date.now() : false;

  return (
    <li>
      <Link
        to={generatePath(ROUTES.teacherGroup, { groupId: group.id })}
        className="hover:bg-surface-elevated flex items-start justify-between gap-4 py-5 pr-2 pl-1 transition-colors"
      >
        <div className="min-w-0">
          {/* Wraps rather than truncates: a group's name is what its owner
              identifies it by, and «11-А, підготовка до НМТ» came out as
              «11-А, підготовка до…» on a phone. */}
          <p className="text-text-primary font-medium break-words">{group.name}</p>
          <p className="text-text-muted mt-1 text-xs">
            {group.subject.name} · {group.studentCount}{' '}
            {pluralUk(group.studentCount, 'учень', 'учні', 'учнів')}
          </p>

          {loading ? (
            <Skeleton className="mt-3 h-4 w-48" />
          ) : latest ? (
            <p className="text-text-secondary mt-3 text-sm">
              «{latest.title}» — {overdue ? 'дедлайн минув' : 'до'} {formatShortDate(latest.dueAt)}
              {outstanding > 0 && (
                <span className={overdue ? 'text-warning' : undefined}> · не здали {outstanding}</span>
              )}
            </p>
          ) : (
            <p className="text-text-muted mt-3 text-sm">Роботи ще не видавали.</p>
          )}
        </div>

        <div className="shrink-0 text-right">
          {latest && !loading && (
            <>
              <p className="text-text-primary font-display text-2xl font-bold lining-nums">
                {latest.submittedCount}
                <span className="text-text-muted text-base font-normal">/{latest.targetCount}</span>
              </p>
              <p className="text-text-muted text-xs">здали</p>
            </>
          )}
        </div>
      </Link>
    </li>
  );
}
