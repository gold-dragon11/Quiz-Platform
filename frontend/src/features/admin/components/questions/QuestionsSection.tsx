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
  [QuestionType.SINGLE_CHOICE]: 'Single choice',
  [QuestionType.MATCHING]: 'Matching',
};
const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  [Difficulty.BEGINNER]: 'Beginner',
  [Difficulty.INTERMEDIATE]: 'Intermediate',
  [Difficulty.ADVANCED]: 'Advanced',
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
    { value: '', label: 'All subjects' },
    ...(subjects.data ?? []).map((s) => ({ value: s.id, label: s.name })),
  ];
  const topicFilterOptions: SelectOption[] = [
    { value: '', label: 'All topics' },
    ...(filterTopics.data ?? []).map((t) => ({ value: t.id, label: t.name })),
  ];

  const togglePublish = (question: QuestionRecord): void => {
    publishQuestion.mutate(
      { id: question.id, isPublished: !question.isPublished },
      {
        onSuccess: () =>
          toast.success(question.isPublished ? 'Question unpublished.' : 'Question published.'),
        onError: (error) => toast.error(isApiError(error) ? error.message : 'Could not update publication.'),
      },
    );
  };

  const confirmDelete = (): void => {
    if (!deleting) {
      return;
    }
    deleteQuestion.mutate(deleting.id, {
      onSuccess: () => {
        toast.success('Question deleted.');
        setDeleting(null);
      },
      onError: (error) => {
        setDeleting(null);
        toast.error(isApiError(error) ? error.message : 'Could not delete the question.');
      },
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="sm:w-44">
            <Select
              aria-label="Filter by subject"
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
              aria-label="Filter by topic"
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
              aria-label="Search questions"
              placeholder="Search questions…"
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
          New question
        </Button>
      </div>

      {list.isPending ? (
        <TableSkeleton />
      ) : list.isError ? (
        <SectionError onRetry={() => void list.refetch()} />
      ) : list.data.items.length === 0 ? (
        <EmptyState
          title={search || subjectId ? 'No matches' : 'No questions yet'}
          description={
            search || subjectId
              ? 'No questions match your filters.'
              : 'Create your first question to get started.'
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
                New question
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
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Topic</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Difficulty</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
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
                        {question.isPublished ? 'Published' : 'Draft'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => togglePublish(question)}>
                          {question.isPublished ? 'Unpublish' : 'Publish'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditing(question);
                            setFormOpen(true);
                          }}
                        >
                          Edit
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setDeleting(question)}>
                          Delete
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
        title="Delete question?"
        description={
          deleting
            ? `This question will be removed. This is a soft delete; historical results stay intact.`
            : ''
        }
        confirmLabel="Delete"
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
