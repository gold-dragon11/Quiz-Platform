import { useMemo, useState } from 'react';
import { toast } from '@/stores/toast-store';
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value';
import { isApiError } from '@/shared/utils/apply-api-error';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Input } from '@/shared/ui/Input';
import { Select, type SelectOption } from '@/shared/ui/Select';
import { Skeleton } from '@/shared/ui/Skeleton';
import { useSubjectsLookup } from '@/features/admin/hooks/use-admin-lookups';
import { useAdminTopics, useDeleteTopic } from '@/features/admin/hooks/use-admin-topics';
import type { TopicRecord } from '@/features/admin/types/admin.types';
import { SectionError } from '@/features/admin/components/SectionError';
import { Pagination } from '@/features/admin/components/Pagination';
import { TopicFormModal } from '@/features/admin/components/topics/TopicFormModal';

const PAGE_SIZE = 10;

/** Topics admin: list, filter by subject, search, create, edit, delete (§5). */
export function TopicsSection(): React.JSX.Element {
  const [page, setPage] = useState(1);
  const [subjectId, setSubjectId] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const search = useDebouncedValue(searchInput.trim(), 300);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TopicRecord | undefined>(undefined);
  const [deleting, setDeleting] = useState<TopicRecord | null>(null);

  const subjects = useSubjectsLookup();
  const subjectsById = useMemo(
    () => new Map((subjects.data ?? []).map((s) => [s.id, s.name])),
    [subjects.data],
  );

  const list = useAdminTopics({
    page,
    pageSize: PAGE_SIZE,
    search: search || undefined,
    subjectId: subjectId || undefined,
  });
  const deleteTopic = useDeleteTopic();

  const subjectFilterOptions: SelectOption[] = [
    { value: '', label: 'All subjects' },
    ...(subjects.data ?? []).map((s) => ({ value: s.id, label: s.name })),
  ];

  const openCreate = (): void => {
    setEditing(undefined);
    setFormOpen(true);
  };

  const confirmDelete = (): void => {
    if (!deleting) {
      return;
    }
    deleteTopic.mutate(deleting.id, {
      onSuccess: () => {
        toast.success('Topic deleted.');
        setDeleting(null);
      },
      onError: (error) => {
        setDeleting(null);
        toast.error(isApiError(error) ? error.message : 'Could not delete the topic.');
      },
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="sm:w-48">
            <Select
              aria-label="Filter by subject"
              options={subjectFilterOptions}
              value={subjectId}
              onChange={(e) => {
                setSubjectId(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="sm:w-56">
            <Input
              type="search"
              aria-label="Search topics"
              placeholder="Search topics…"
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>
        <Button onClick={openCreate}>New topic</Button>
      </div>

      {list.isPending ? (
        <TableSkeleton />
      ) : list.isError ? (
        <SectionError onRetry={() => void list.refetch()} />
      ) : list.data.items.length === 0 ? (
        <EmptyState
          title={search || subjectId ? 'No matches' : 'No topics yet'}
          description={
            search || subjectId ? 'No topics match your filters.' : 'Create your first topic to get started.'
          }
          action={
            !search &&
            !subjectId && (
              <Button size="sm" onClick={openCreate}>
                New topic
              </Button>
            )
          }
        />
      ) : (
        <>
          <div className="border-border overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead className="text-text-muted border-border border-b text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Subject</th>
                  <th className="px-4 py-3 font-medium">Slug</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {list.data.items.map((topic) => (
                  <tr key={topic.id}>
                    <td className="text-text-primary px-4 py-3 font-medium">{topic.name}</td>
                    <td className="text-text-secondary px-4 py-3">
                      {subjectsById.get(topic.subjectId) ?? '—'}
                    </td>
                    <td className="text-text-muted px-4 py-3">{topic.slug}</td>
                    <td className="px-4 py-3">
                      <Badge tone={topic.isPublished ? 'success' : 'neutral'}>
                        {topic.isPublished ? 'Published' : 'Draft'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditing(topic);
                            setFormOpen(true);
                          }}
                        >
                          Edit
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setDeleting(topic)}>
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

      <TopicFormModal
        open={formOpen}
        topic={editing}
        subjects={subjects.data ?? []}
        onClose={() => setFormOpen(false)}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete topic?"
        description={deleting ? `“${deleting.name}” will be removed. This is a soft delete.` : ''}
        confirmLabel="Delete"
        confirmVariant="danger"
        isLoading={deleteTopic.isPending}
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
