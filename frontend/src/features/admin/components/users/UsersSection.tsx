import { useState } from 'react';
import { toast } from '@/stores/toast-store';
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value';
import { isApiError } from '@/shared/utils/apply-api-error';
import { UserRole } from '@/shared/types/enums';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Input } from '@/shared/ui/Input';
import { Select, type SelectOption } from '@/shared/ui/Select';
import { Skeleton } from '@/shared/ui/Skeleton';
import { formatShortDate } from '@/shared/utils/format';
import { Pagination } from '@/features/admin/components/Pagination';
import { SectionError } from '@/features/admin/components/SectionError';
import { useAdminUsers, useSetUserRole } from '@/features/admin/hooks/use-admin-users';
import type { AdminUserRecord, AssignableRole } from '@/features/admin/types/admin.types';

const PAGE_SIZE = 10;

const ROLE_LABEL: Record<UserRole, string> = {
  USER: 'Учень',
  TEACHER: 'Викладач',
  ADMIN: 'Адміністратор',
};

const ROLE_FILTER: SelectOption[] = [
  { value: '', label: 'Усі ролі' },
  { value: UserRole.USER, label: 'Учні' },
  { value: UserRole.TEACHER, label: 'Викладачі' },
  { value: UserRole.ADMIN, label: 'Адміністратори' },
];

/**
 * The account directory, and the only place a teacher is made.
 *
 * There is no self-service path to the teacher role, and that is the product
 * decision this screen implements: a tutor's account can read a whole group's
 * mistakes, so it is granted one account at a time by somebody who decided to.
 *
 * Administrator accounts appear in the list but carry no control. The API
 * refuses to change them in either direction, and a button that only ever
 * produces an error is worse than no button.
 */
export function UsersSection(): React.JSX.Element {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const search = useDebouncedValue(searchInput.trim(), 300);
  const [pending, setPending] = useState<{ user: AdminUserRecord; role: AssignableRole } | null>(null);

  const list = useAdminUsers({
    page,
    pageSize: PAGE_SIZE,
    search: search || undefined,
    role: (roleFilter as UserRole) || undefined,
  });
  const setRole = useSetUserRole();

  function confirmRoleChange(): void {
    if (!pending) {
      return;
    }
    setRole.mutate(
      { userId: pending.user.id, role: pending.role },
      {
        onSuccess: () => {
          toast.success(
            pending.role === UserRole.TEACHER ? 'Роль викладача надано.' : 'Роль викладача знято.',
          );
          setPending(null);
        },
        onError: (error) => {
          setPending(null);
          toast.error(isApiError(error) ? error.message : 'Не вдалося змінити роль.');
        },
      },
    );
  }

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="sm:max-w-xs sm:flex-1">
          <Input
            placeholder="Пошук за ніком, імʼям або поштою"
            value={searchInput}
            onChange={(event) => {
              setSearchInput(event.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="sm:w-48">
          <Select
            options={ROLE_FILTER}
            value={roleFilter}
            onChange={(event) => {
              setRoleFilter(event.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      {list.isPending ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-16" />
          ))}
        </div>
      ) : list.isError ? (
        <SectionError onRetry={() => void list.refetch()} />
      ) : list.data.items.length === 0 ? (
        <EmptyState
          title="Нікого не знайдено"
          description="Спробуйте інший запит — пошук працює за ніком, іменем і поштою."
        />
      ) : (
        <>
          <div className="border-border overflow-x-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead className="text-text-muted border-border border-b text-left text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">Обліковий запис</th>
                  <th className="px-4 py-3 font-medium">Роль</th>
                  <th className="px-4 py-3 font-medium">Зареєстровано</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {list.data.items.map((user) => (
                  <UserRow key={user.id} user={user} onChangeRole={setPending} />
                ))}
              </tbody>
            </table>
          </div>

          <Pagination page={page} totalPages={list.data.totalPages} onPageChange={setPage} />
        </>
      )}

      <ConfirmDialog
        open={pending !== null}
        title={pending?.role === UserRole.TEACHER ? 'Надати роль викладача?' : 'Зняти роль викладача?'}
        description={
          pending?.role === UserRole.TEACHER
            ? `${pending.user.displayName ?? pending.user.email} зможе створювати групи, видавати завдання й бачити зведення успішності своїх учнів.`
            : `${pending?.user.displayName ?? pending?.user.email ?? ''} втратить доступ до груп і завдань. Самі групи та їхня історія залишаться.`
        }
        confirmLabel={pending?.role === UserRole.TEACHER ? 'Надати' : 'Зняти'}
        isLoading={setRole.isPending}
        onConfirm={confirmRoleChange}
        onCancel={() => setPending(null)}
      />
    </section>
  );
}

function UserRow({
  user,
  onChangeRole,
}: {
  user: AdminUserRecord;
  onChangeRole: (pending: { user: AdminUserRecord; role: AssignableRole }) => void;
}): React.JSX.Element {
  const isAdmin = user.role === UserRole.ADMIN;
  const isTeacher = user.role === UserRole.TEACHER;

  return (
    <tr>
      <td className="px-4 py-3">
        <p className="text-text-primary font-medium">{user.displayName ?? user.username ?? '—'}</p>
        <p className="text-text-muted text-xs">{user.email}</p>
      </td>
      <td className="px-4 py-3">
        <Badge tone={isAdmin ? 'warning' : isTeacher ? 'info' : 'neutral'}>{ROLE_LABEL[user.role]}</Badge>
      </td>
      <td className="text-text-secondary px-4 py-3">{formatShortDate(user.createdAt)}</td>
      <td className="px-4 py-3 text-right">
        {isAdmin ? (
          // Stated rather than left blank: an empty cell reads as a bug, and
          // this is a rule worth knowing.
          <span className="text-text-muted text-xs">Змінюється не тут</span>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onChangeRole({ user, role: isTeacher ? UserRole.USER : UserRole.TEACHER })}
          >
            {isTeacher ? 'Зняти викладача' : 'Зробити викладачем'}
          </Button>
        )}
      </td>
    </tr>
  );
}
