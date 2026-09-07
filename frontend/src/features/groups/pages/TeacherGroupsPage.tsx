import { generatePath, Link } from 'react-router-dom';
import { ROUTES } from '@/shared/constants/routes';
import { Alert } from '@/shared/ui/Alert';
import { EmptyState } from '@/shared/ui/EmptyState';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Skeleton } from '@/shared/ui/Skeleton';
import { formatShortDate, pluralUk } from '@/shared/utils/format';
import { CreateGroupForm } from '@/features/groups/components/CreateGroupForm';
import { useTeacherGroups } from '@/features/groups/hooks/use-groups';
import type { TeacherGroup } from '@/features/groups/types/group.types';

/**
 * `/teacher/groups` (RequireTeacher) — the groups this teacher owns.
 *
 * Archived groups stay on the list rather than disappearing: last year's work
 * is what a tutor shows when deciding whether to run the course again, and a
 * group that vanished would take its assignments and results with it.
 */
export function TeacherGroupsPage(): React.JSX.Element {
  const groups = useTeacherGroups();

  const live = (groups.data ?? []).filter((group) => !group.archivedAt);
  const archived = (groups.data ?? []).filter((group) => group.archivedAt);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        eyebrow="Викладання"
        title="Групи"
        lead="Група — це список учнів під один предмет. Ви даєте код, вони заходять; далі групі можна видавати завдання й дивитися, як вона справляється."
      />

      <section className="mt-12">
        <h2 className="text-text-muted border-border border-b pb-3 text-xs tracking-[0.18em] uppercase">
          Нова група
        </h2>
        <div className="mt-6">
          <CreateGroupForm />
        </div>
      </section>

      <section className="mt-16">
        <h2 className="text-text-muted mb-6 text-xs tracking-[0.18em] uppercase">Ваші групи</h2>

        {groups.isPending ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        ) : groups.isError ? (
          <Alert variant="error">Не вдалося завантажити групи. Оновіть сторінку.</Alert>
        ) : groups.data.length === 0 ? (
          <EmptyState
            title="Груп ще немає"
            description="Створіть першу — код запрошення згенерується сам, лишиться поділитися ним з учнями."
          />
        ) : (
          <>
            <ul className="divide-border border-border divide-y border-t">
              {live.map((group) => (
                <GroupRow key={group.id} group={group} />
              ))}
            </ul>

            {archived.length > 0 && (
              <div className="mt-12">
                <h3 className="text-text-muted mb-4 text-xs tracking-[0.18em] uppercase">Заархівовані</h3>
                <ul className="divide-border border-border divide-y border-t opacity-60">
                  {archived.map((group) => (
                    <GroupRow key={group.id} group={group} />
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

function GroupRow({ group }: { group: TeacherGroup }): React.JSX.Element {
  return (
    <li>
      <Link
        to={generatePath(ROUTES.teacherGroup, { groupId: group.id })}
        className="hover:bg-surface-elevated flex items-center justify-between gap-4 py-5 pr-2 pl-1 transition-colors"
      >
        <div className="min-w-0">
          <p className="text-text-primary truncate font-medium">{group.name}</p>
          <p className="text-text-muted mt-1 text-xs">
            {group.subject.name} · створено {formatShortDate(group.createdAt)}
            {group.archivedAt && ` · заархівовано ${formatShortDate(group.archivedAt)}`}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-text-primary font-display text-2xl font-bold lining-nums">
            {group.studentCount}
          </p>
          <p className="text-text-muted text-xs">{pluralUk(group.studentCount, 'учень', 'учні', 'учнів')}</p>
        </div>
      </Link>
    </li>
  );
}
