import { useMemo, useState } from 'react';
import { toast } from '@/stores/toast-store';
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value';
import { isApiError } from '@/shared/utils/apply-api-error';
import { Difficulty, QuestionType } from '@/shared/types/enums';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Input } from '@/shared/ui/Input';
import { Select, type SelectOption } from '@/shared/ui/Select';
import { Skeleton } from '@/shared/ui/Skeleton';
import { useSubjectsLookup, useTopicsLookup } from '@/features/admin/hooks/use-admin-lookups';
import {
  useAdminQuestions,
  useDeleteQuestion,
  usePublishQuestion,
} from '@/features/admin/hooks/use-admin-questions';
import type { QuestionRecord } from '@/features/admin/types/admin.types';
import { SectionError } from '@/features/admin/components/SectionError';
import { Pagination } from '@/features/admin/components/Pagination';
import { QuestionFormModal } from '@/features/admin/components/questions/QuestionFormModal';

const PAGE_SIZE = 10;

const TYPE_LABEL: Record<QuestionType, string> = {
  [QuestionType.SINGLE_CHOICE]: 'Одна відповідь',
  [QuestionType.MATCHING]: 'Відповідності',
};
const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  [Difficulty.BEGINNER]: 'Початковий',
  [Difficulty.INTERMEDIATE]: 'Середній',
  [Difficulty.ADVANCED]: 'Високий',
};

/** Questions admin: list, filter by subject/topic, create, edit, publish, delete (§6-7, §10). */
export function QuestionsSection(): React.JSX.Element {
  const [page, setPage] = useState(1);
  const [subjectId, setSubjectId] = useState('');
  const [topicId, setTopicId] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const search = useDebouncedValue(searchInput.trim(), 300);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<QuestionRecord | undefined>(undefined);
  const [deleting, setDeleting] = useState<QuestionRecord | null>(null);

  const subjects = useSubjectsLookup();
  const filterTopics = useTopicsLookup(subjectId || undefined);
  const allTopics = useTopicsLookup();
  const topicsById = useMemo(
    () => new Map((allTopics.data ?? []).map((t) => [t.id, t.name])),
    [allTopics.data],
  );

  const list = useAdminQuestions({
    page,
    pageSize: PAGE_SIZE,
    search: search || undefined,
    subjectId: subjectId || undefined,
    topicId: topicId || undefined,
  });
  const deleteQuestion = useDeleteQuestion();
  const publishQuestion = usePublishQuestion();

  const subjectFilterOptions: SelectOption[] = [
    { value: '', label: 'Усі предмети' },
    ...(subjects.data ?? []).map((s) => ({ value: s.id, label: s.name })),
  ];
  const topicFilterOptions: SelectOption[] = [
    { value: '', label: 'Усі теми' },
    ...(filterTopics.data ?? []).map((t) => ({ value: t.id, label: t.name })),
  ];

  const togglePublish = (question: QuestionRecord): void => {
    publishQuestion.mutate(
      { id: question.id, isPublished: !question.isPublished },
      {
        onSuccess: () =>
          toast.success(question.isPublished ? 'Питання знято з публікації.' : 'Питання опубліковано.'),
        onError: (error) =>
          toast.error(isApiError(error) ? error.message : 'Не вдалося змінити статус публікації.'),
      },
    );
  };

  const confirmDelete = (): void => {
    if (!deleting) {
      return;
    }
    deleteQuestion.mutate(deleting.id, {
      onSuccess: () => {
        toast.success('Питання видалено.');
        setDeleting(null);
      },
      onError: (error) => {
        setDeleting(null);
        toast.error(isApiError(error) ? error.message : 'Не вдалося видалити питання.');
      },
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="sm:w-44">
            <Select
              aria-label="Фільтр за предметом"
              options={subjectFilterOptions}
              value={subjectId}
              onChange={(e) => {
                setSubjectId(e.target.value);
                setTopicId('');
                setPage(1);
              }}
            />
          </div>
          <div className="sm:w-44">
            <Select
              aria-label="Фільтр за темою"
              options={topicFilterOptions}
              value={topicId}
              disabled={!subjectId || filterTopics.isPending}
              onChange={(e) => {
                setTopicId(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="sm:w-52">
            <Input
              type="search"
              aria-label="Пошук питань"
              placeholder="Пошук питань…"
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>
        <Button
          onClick={() => {
            setEditing(undefined);
            setFormOpen(true);
          }}
        >
          Нове питання
        </Button>
      </div>

      {list.isPending ? (
        <TableSkeleton />
      ) : list.isError ? (
        <SectionError onRetry={() => void list.refetch()} />
      ) : list.data.items.length === 0 ? (
        <EmptyState
          title={search || subjectId ? 'Нічого не знайдено' : 'Питань поки немає'}
          description={
            search || subjectId
              ? 'Жодне питання не відповідає фільтрам.'
              : 'Створіть перше питання, щоб почати.'
          }
          action={
            !search &&
            !subjectId && (
              <Button
                size="sm"
                onClick={() => {
                  setEditing(undefined);
                  setFormOpen(true);
                }}
              >
                Нове питання
              </Button>
            )
          }
        />
      ) : (
        <>
          <div className="border-border overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[52rem] text-left text-sm">
              <thead className="text-text-muted border-border border-b text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">Заголовок</th>
                  <th className="px-4 py-3 font-medium">Тема</th>
                  <th className="px-4 py-3 font-medium">Тип</th>
                  <th className="px-4 py-3 font-medium">Рівень</th>
                  <th className="px-4 py-3 font-medium">Статус</th>
                  <th className="px-4 py-3 text-right font-medium">Дії</th>
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {list.data.items.map((question) => (
                  <tr key={question.id}>
                    <td className="text-text-primary max-w-xs truncate px-4 py-3 font-medium">
                      {question.title}
                    </td>
                    <td className="text-text-secondary px-4 py-3">
                      {topicsById.get(question.topicId) ?? '—'}
                    </td>
                    <td className="text-text-secondary px-4 py-3">{TYPE_LABEL[question.type]}</td>
                    <td className="text-text-secondary px-4 py-3">
                      {question.difficulty ? DIFFICULTY_LABEL[question.difficulty] : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={question.isPublished ? 'success' : 'neutral'}>
                        {question.isPublished ? 'Опубліковано' : 'Чернетка'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => togglePublish(question)}>
                          {question.isPublished ? 'Зняти з публікації' : 'Опублікувати'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditing(question);
                            setFormOpen(true);
                          }}
                        >
                          Редагувати
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setDeleting(question)}>
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

      <QuestionFormModal
        open={formOpen}
        question={editing}
        subjects={subjects.data ?? []}
        onClose={() => setFormOpen(false)}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Видалити питання?"
        description={
          deleting ? `Питання буде прибрано. Це мʼяке видалення — історичні результати лишаються цілими.` : ''
        }
        confirmLabel="Видалити"
        confirmVariant="danger"
        isLoading={deleteQuestion.isPending}
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
