import { useMemo, useState } from 'react';
import { toast } from '@/stores/toast-store';
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value';
import { isApiError } from '@/shared/utils/apply-api-error';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Input } from '@/shared/ui/Input';
import { Skeleton } from '@/shared/ui/Skeleton';
import { QuizType } from '@/shared/types/enums';
import { useSubjectsLookup, useTopicsLookup } from '@/features/admin/hooks/use-admin-lookups';
import { useAdminQuizzes, useDeleteQuiz } from '@/features/admin/hooks/use-admin-quizzes';
import type { QuizRecord } from '@/features/admin/types/admin.types';
import { SectionError } from '@/features/admin/components/SectionError';
import { Pagination } from '@/features/admin/components/Pagination';
import { QuizFormModal } from '@/features/admin/components/quizzes/QuizFormModal';

const PAGE_SIZE = 10;

const MODE_LABEL: Record<QuizType, string> = {
  [QuizType.SUBJECT_QUIZ]: 'Subject',
  [QuizType.RANDOM_QUIZ]: 'Random',
};

/** Quizzes admin: list, search, create, edit, delete (docs/04-api/admin.md §8). */
export function QuizzesSection(): React.JSX.Element {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const search = useDebouncedValue(searchInput.trim(), 300);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<QuizRecord | undefined>(undefined);
  const [deleting, setDeleting] = useState<QuizRecord | null>(null);

  const subjects = useSubjectsLookup();
  const topics = useTopicsLookup();
  const subjectsById = useMemo(
    () => new Map((subjects.data ?? []).map((s) => [s.id, s.name])),
    [subjects.data],
  );
  const topicsById = useMemo(() => new Map((topics.data ?? []).map((t) => [t.id, t.name])), [topics.data]);

  const list = useAdminQuizzes({
    page,
    pageSize: PAGE_SIZE,
    search: search || undefined,
  });
  const deleteQuiz = useDeleteQuiz();

  const confirmDelete = (): void => {
    if (!deleting) {
      return;
    }
    deleteQuiz.mutate(deleting.id, {
      onSuccess: () => {
        toast.success('Тест видалено.');
        setDeleting(null);
      },
      onError: (error) => {
        setDeleting(null);
        toast.error(isApiError(error) ? error.message : 'Не вдалося видалити тест.');
      },
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="sm:max-w-xs sm:flex-1">
          <Input
            type="search"
            aria-label="Пошук тестів"
            placeholder="Пошук тестів…"
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Button
          onClick={() => {
            setEditing(undefined);
            setFormOpen(true);
          }}
        >
          Новий тест
        </Button>
      </div>

      {list.isPending ? (
        <TableSkeleton />
      ) : list.isError ? (
        <SectionError onRetry={() => void list.refetch()} />
      ) : list.data.items.length === 0 ? (
        <EmptyState
          title={search ? 'Нічого не знайдено' : 'Тестів поки немає'}
          description={
            search
              ? 'Жоден тест не відповідає запиту.'
              : 'Створіть багаторазову конфігурацію тесту, щоб почати.'
          }
          action={
            !search && (
              <Button
                size="sm"
                onClick={() => {
                  setEditing(undefined);
                  setFormOpen(true);
                }}
              >
                Новий тест
              </Button>
            )
          }
        />
      ) : (
        <>
          <div className="border-border overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[48rem] text-left text-sm">
              <thead className="text-text-muted border-border border-b text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">Заголовок</th>
                  <th className="px-4 py-3 font-medium">Предмет</th>
                  <th className="px-4 py-3 font-medium">Тема</th>
                  <th className="px-4 py-3 font-medium">Питань</th>
                  <th className="px-4 py-3 font-medium">Режим</th>
                  <th className="px-4 py-3 font-medium">Статус</th>
                  <th className="px-4 py-3 text-right font-medium">Дії</th>
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {list.data.items.map((quiz) => (
                  <tr key={quiz.id}>
                    <td className="text-text-primary px-4 py-3 font-medium">{quiz.title}</td>
                    <td className="text-text-secondary px-4 py-3">
                      {subjectsById.get(quiz.subjectId) ?? '—'}
                    </td>
                    <td className="text-text-secondary px-4 py-3">
                      {quiz.topicId ? (topicsById.get(quiz.topicId) ?? '—') : '—'}
                    </td>
                    <td className="text-text-secondary px-4 py-3">{quiz.questionCount}</td>
                    <td className="text-text-secondary px-4 py-3">{MODE_LABEL[quiz.mode]}</td>
                    <td className="px-4 py-3">
                      <Badge tone={quiz.isPublished ? 'success' : 'neutral'}>
                        {quiz.isPublished ? 'Опубліковано' : 'Чернетка'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditing(quiz);
                            setFormOpen(true);
                          }}
                        >
                          Редагувати
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setDeleting(quiz)}>
                          Видалити
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={list.data.page} totalPages={list.data.totalPages} onPageChange={setPage} />
        </>
      )}

      <QuizFormModal
        open={formOpen}
        quiz={editing}
        subjects={subjects.data ?? []}
        onClose={() => setFormOpen(false)}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Видалити тест?"
        description={deleting ? `«${deleting.title}» буде прибрано. Це мʼяке видалення.` : ''}
        confirmLabel="Видалити"
        confirmVariant="danger"
        isLoading={deleteQuiz.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}

function TableSkeleton(): React.JSX.Element {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded-lg" />
      ))}
    </div>
  );
}
