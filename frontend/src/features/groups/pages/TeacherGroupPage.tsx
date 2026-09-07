import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ROUTES } from '@/shared/constants/routes';
import { toast } from '@/stores/toast-store';
import { Alert } from '@/shared/ui/Alert';
import { Button } from '@/shared/ui/Button';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Input } from '@/shared/ui/Input';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Skeleton } from '@/shared/ui/Skeleton';
import { formatShortDate } from '@/shared/utils/format';
import { isApiError } from '@/shared/utils/apply-api-error';
import { GroupAssignments } from '@/features/assignments/components/GroupAssignments';
import { InviteCode } from '@/features/groups/components/InviteCode';
import { useGroupActions, useGroupRoster, useTeacherGroup } from '@/features/groups/hooks/use-groups';
import type { GroupStudent, TeacherGroup } from '@/features/groups/types/group.types';

/**
 * `/teacher/groups/:groupId` (RequireTeacher) — one group: its code, its
 * roster, and the two decisions a teacher makes about it.
 *
 * A group belonging to somebody else answers 404, not 403, and this page shows
 * that as "не знайдено": a teacher has no business learning that a particular
 * group id exists at all.
 */
export function TeacherGroupPage(): React.JSX.Element {
  const { groupId = '' } = useParams();
  const group = useTeacherGroup(groupId);

  if (group.isPending) {
    return (
      <div className="mx-auto max-w-4xl">
        <Skeleton className="h-32" />
        <Skeleton className="mt-10 h-40" />
      </div>
    );
  }

  if (group.isError || !group.data) {
    return (
      <div className="mx-auto max-w-4xl">
        <EmptyState
          title="Групу не знайдено"
          description="Можливо, її вже немає або вона належить іншому викладачеві."
        />
      </div>
    );
  }

  return <GroupDetail group={group.data} />;
}

function GroupDetail({ group }: { group: TeacherGroup }): React.JSX.Element {
  const navigate = useNavigate();
  const roster = useGroupRoster(group.id);
  const actions = useGroupActions(group.id);

  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(group.name);
  const [archiving, setArchiving] = useState(false);
  const [removing, setRemoving] = useState<GroupStudent | null>(null);

  const archived = group.archivedAt !== null;

  function submitRename(): void {
    const trimmed = name.trim();
    if (!trimmed || trimmed === group.name) {
      setRenaming(false);
      return;
    }
    actions.rename.mutate(trimmed, {
      onSuccess: () => {
        setRenaming(false);
        toast.success('Назву змінено.');
      },
      onError: (error) => toast.error(isApiError(error) ? error.message : 'Не вдалося змінити назву.'),
    });
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader eyebrow={group.subject.name} title={group.name} />

      {archived && (
        <Alert variant="warning" className="mt-8">
          Групу заархівовано. Нові учні приєднатися не можуть, а завдання видавати вже не можна — але вся
          історія лишається на місці.
        </Alert>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        {renaming ? (
          <div className="flex w-full max-w-md items-end gap-3">
            <div className="flex-1">
              <Input
                label="Назва групи"
                maxLength={100}
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <Button size="sm" onClick={submitRename} isLoading={actions.rename.isPending}>
              Зберегти
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setName(group.name);
                setRenaming(false);
              }}
            >
              Скасувати
            </Button>
          </div>
        ) : (
          <>
            <Button variant="secondary" size="sm" onClick={() => setRenaming(true)}>
              Перейменувати
            </Button>
            {!archived && (
              <Button variant="ghost" size="sm" onClick={() => setArchiving(true)}>
                Заархівувати
              </Button>
            )}
          </>
        )}
      </div>

      <div className="mt-12">
        <InviteCode
          code={group.inviteCode}
          disabled={archived}
          regenerating={actions.regenerateInviteCode.isPending}
          onRegenerate={() =>
            actions.regenerateInviteCode.mutate(undefined, {
              onSuccess: () => toast.success('Код замінено.'),
              onError: (error) => toast.error(isApiError(error) ? error.message : 'Не вдалося замінити код.'),
            })
          }
        />
      </div>

      <section className="mt-16">
        <h2 className="text-text-muted mb-6 text-xs tracking-[0.18em] uppercase">Учні</h2>

        {roster.isPending ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        ) : roster.isError ? (
          <Alert variant="error">Не вдалося завантажити список учнів.</Alert>
        ) : roster.data.length === 0 ? (
          <EmptyState
            title="У групі поки нікого"
            description="Поділіться кодом запрошення — щойно хтось увійде, він зʼявиться тут."
          />
        ) : (
          <ul className="divide-border border-border divide-y border-t">
            {roster.data.map((student) => (
              <li key={student.id} className="flex items-center justify-between gap-4 py-4">
                <div className="min-w-0">
                  <p className="text-text-primary truncate font-medium">
                    {student.displayName ?? student.username ?? '—'}
                  </p>
                  <p className="text-text-muted mt-1 text-xs">
                    {student.username && `@${student.username} · `}
                    приєднався {formatShortDate(student.joinedAt)}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setRemoving(student)}>
                  Прибрати
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <GroupAssignments groupId={group.id} archived={archived} />

      <ConfirmDialog
        open={archiving}
        title="Заархівувати групу?"
        description="Нові учні більше не приєднаються, а видавати завдання буде не можна. Усе, що вже зроблено — завдання, результати, склад — лишиться. Це не видалення."
        confirmLabel="Заархівувати"
        isLoading={actions.archive.isPending}
        onConfirm={() =>
          actions.archive.mutate(undefined, {
            onSuccess: () => {
              setArchiving(false);
              toast.success('Групу заархівовано.');
            },
            onError: (error) => {
              setArchiving(false);
              toast.error(isApiError(error) ? error.message : 'Не вдалося заархівувати групу.');
            },
          })
        }
        onCancel={() => setArchiving(false)}
      />

      <ConfirmDialog
        open={removing !== null}
        title="Прибрати учня з групи?"
        description={`${removing?.displayName ?? removing?.username ?? 'Учень'} більше не отримуватиме завдань цієї групи. Обліковий запис, статистика й уся історія помилок лишаються — вони ніколи не належали групі.`}
        confirmLabel="Прибрати"
        confirmVariant="danger"
        isLoading={actions.removeStudent.isPending}
        onConfirm={() => {
          if (!removing) {
            return;
          }
          actions.removeStudent.mutate(removing.id, {
            onSuccess: () => {
              setRemoving(null);
              toast.success('Учня прибрано з групи.');
            },
            onError: (error) => {
              setRemoving(null);
              toast.error(isApiError(error) ? error.message : 'Не вдалося прибрати учня.');
            },
          });
        }}
        onCancel={() => setRemoving(null)}
      />

      <div className="mt-16">
        <Button variant="ghost" size="sm" onClick={() => navigate(ROUTES.teacherGroups)}>
          ← До всіх груп
        </Button>
      </div>
    </div>
  );
}
