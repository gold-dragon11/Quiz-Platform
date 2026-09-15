import { useState } from 'react';
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
import { useJoinGroup, useLeaveGroup, useStudentGroups } from '@/features/groups/hooks/use-groups';
import type { JoinedGroup, StudentGroup } from '@/features/groups/types/group.types';

/**
 * `/groups` (RequireAuth) — the groups a learner belongs to, and the box they
 * paste a code into.
 *
 * No invite codes are shown here. The code belongs to the teacher: a student
 * holding it could grow the group — and the teacher's bill — without the
 * teacher knowing.
 */
export function StudentGroupsPage(): React.JSX.Element {
  const groups = useStudentGroups();
  const join = useJoinGroup();
  const leave = useLeaveGroup();

  const [code, setCode] = useState('');
  const [joined, setJoined] = useState<JoinedGroup | null>(null);
  const [leaving, setLeaving] = useState<StudentGroup | null>(null);

  const joinError = isApiError(join.error)
    ? join.error.message
    : join.error
      ? 'Не вдалося приєднатися. Спробуйте ще раз.'
      : null;

  function submit(event: React.FormEvent): void {
    event.preventDefault();
    if (!code.trim()) {
      return;
    }
    // A new attempt replaces the last outcome: the notice of an earlier join
    // standing under a fresh «no such code» reads as both at once.
    setJoined(null);
    join.mutate(code.trim(), {
      onSuccess: (group) => {
        setJoined(group);
        setCode('');
      },
    });
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        eyebrow="Навчання"
        title="Мої групи"
        lead="Група — це звʼязок з репетитором під один предмет. Він видає завдання й бачить, як вони йдуть."
      />

      <section className="mt-12">
        <h2 className="text-text-muted border-border border-b pb-3 text-xs tracking-[0.18em] uppercase">
          Приєднатися
        </h2>

        <form onSubmit={submit} noValidate className="mt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="sm:w-72">
              <Input
                label="Код запрошення"
                placeholder="Введіть код від репетитора"
                autoComplete="off"
                maxLength={32}
                value={code}
                onChange={(event) => setCode(event.target.value)}
                // The wide spacing is for the code once it is typed; the hint
                // is a sentence and must not inherit it, or it runs past the
                // edge of the field.
                className="tracking-[0.2em] uppercase placeholder:normal-case placeholder:tracking-normal"
              />
            </div>
            <Button type="submit" disabled={!code.trim()} isLoading={join.isPending}>
              Приєднатися
            </Button>
          </div>
        </form>

        {joinError && (
          <Alert variant="error" className="mt-5">
            {joinError}
          </Alert>
        )}

        {joined && <JoinedNotice group={joined} onDismiss={() => setJoined(null)} />}
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
            title="Ви поки не в жодній групі"
            description="Якщо ви займаєтеся з репетитором — попросіть у нього код запрошення."
          />
        ) : (
          <ul className="divide-border border-border divide-y border-t">
            {groups.data.map((group) => (
              <li key={group.id} className="flex items-center justify-between gap-4 py-5">
                <div className="min-w-0">
                  <p className="text-text-primary font-medium break-words">{group.name}</p>
                  <p className="text-text-muted mt-1 text-xs">
                    {group.subject.name}
                    {group.teacherName && ` · ${group.teacherName}`} · з {formatShortDate(group.joinedAt)}
                  </p>
                </div>
                {/* Not «Вийти»: that word already means signing out of the
                    account, in the sidebar and under the avatar. Two different
                    exits called the same thing, one of them irreversible from
                    the reader's side without the invite code. */}
                <Button variant="ghost" size="sm" onClick={() => setLeaving(group)}>
                  Покинути групу
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ConfirmDialog
        open={leaving !== null}
        title="Покинути групу?"
        description={`Ви більше не отримуватимете завдань групи «${leaving?.name ?? ''}», і репетитор перестане бачити вашу практику з цього предмета. Ваша статистика й історія помилок лишаються при вас. Повернутися можна за тим самим кодом.`}
        confirmLabel="Покинути групу"
        confirmVariant="danger"
        isLoading={leave.isPending}
        onConfirm={() => {
          if (!leaving) {
            return;
          }
          leave.mutate(leaving.id, {
            onSuccess: () => {
              setLeaving(null);
              toast.success('Ви покинули групу.');
            },
            onError: (error) => {
              setLeaving(null);
              toast.error(isApiError(error) ? error.message : 'Не вдалося вийти з групи.');
            },
          });
        }}
        onCancel={() => setLeaving(null)}
      />
    </div>
  );
}

/**
 * What just happened, said out loud.
 *
 * Joining is the one moment the sharing setting means anything: from here on
 * this tutor sees a summary of the learner's own practice in this subject. It
 * is on by default, and that is only defensible if the learner is told at the
 * point it starts to apply — a switch buried in settings that nobody opens is
 * not consent, and a surprise found later is what sends a teenager to a second
 * account.
 */
function JoinedNotice({
  group,
  onDismiss,
}: {
  group: JoinedGroup;
  onDismiss: () => void;
}): React.JSX.Element {
  return (
    <div className="border-primary/40 bg-primary/5 mt-6 rounded-xl border p-6">
      <p className="text-text-primary font-medium">
        Ви у групі «{group.name}»{group.teacherName ? ` — репетитор ${group.teacherName}` : ''}
      </p>
      <p className="text-text-secondary mt-3 text-sm">
        {group.selfStudyShared ? (
          <>
            Відтепер репетитор бачить не лише ваші домашні завдання, а й зведення вашої власної практики з
            предмета «{group.subject.name}»: скільки тестів, яка точність, які теми даються важче. Окремих
            відповідей він не бачить. Це можна вимкнути в налаштуваннях.
          </>
        ) : (
          <>
            Репетитор бачитиме лише те, що ви зробите за його завданнями. Вашу власну практику ви вимкнули в
            налаштуваннях — вона лишається при вас.
          </>
        )}
      </p>
      <Button variant="ghost" size="sm" className="mt-4" onClick={onDismiss}>
        Зрозуміло
      </Button>
    </div>
  );
}
