import { useState } from 'react';
import { toast } from '@/stores/toast-store';
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value';
import { isApiError } from '@/shared/utils/apply-api-error';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Input } from '@/shared/ui/Input';
import { Skeleton } from '@/shared/ui/Skeleton';
import { useAdminSubjects, useDeleteSubject } from '@/features/admin/hooks/use-admin-subjects';
import type { SubjectRecord } from '@/features/admin/types/admin.types';
import { SectionError } from '@/features/admin/components/SectionError';
import { Pagination } from '@/features/admin/components/Pagination';
import { SubjectFormModal } from '@/features/admin/components/subjects/SubjectFormModal';

const PAGE_SIZE = 10;

/** Subjects admin: list, search, create, edit, delete (docs/04-api/admin.md §4). */
export function SubjectsSection(): React.JSX.Element {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const search = useDebouncedValue(searchInput.trim(), 300);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SubjectRecord | undefined>(undefined);
  const [deleting, setDeleting] = useState<SubjectRecord | null>(null);

  const list = useAdminSubjects({
    page,
    pageSize: PAGE_SIZE,
    search: search || undefined,
  });
  const deleteSubject = useDeleteSubject();

  const openCreate = (): void => {
    setEditing(undefined);
    setFormOpen(true);
  };
  const openEdit = (subject: SubjectRecord): void => {
    setEditing(subject);
    setFormOpen(true);
  };

  const confirmDelete = (): void => {
    if (!deleting) {
      return;
    }
    deleteSubject.mutate(deleting.id, {
      onSuccess: () => {
        toast.success('Subject deleted.');
        setDeleting(null);
      },
      onError: (error) => {
        setDeleting(null);
        toast.error(isApiError(error) ? error.message : 'Could not delete the subject.');
      },
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="sm:max-w-xs sm:flex-1">
          <Input
            type="search"
            aria-label="Search subjects"
            placeholder="Search subjects…"
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Button onClick={openCreate}>New subject</Button>
      </div>

      {list.isPending ? (
        <TableSkeleton />
      ) : list.isError ? (
        <SectionError onRetry={() => void list.refetch()} />
      ) : list.data.items.length === 0 ? (
        <EmptyState
          title={search ? 'No matches' : 'No subjects yet'}
          description={
            search ? 'No subjects match your search.' : 'Create your first subject to get started.'
          }
          action={
            !search && (
              <Button size="sm" onClick={openCreate}>
                New subject
              </Button>
            )
          }
        />
      ) : (
        <>
          <div className="border-border overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead className="text-text-muted border-border border-b text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Slug</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {list.data.items.map((subject) => (
                  <tr key={subject.id}>
                    <td className="text-text-primary px-4 py-3 font-medium">{subject.name}</td>
                    <td className="text-text-muted px-4 py-3">{subject.slug}</td>
                    <td className="px-4 py-3">
                      <Badge tone={subject.isPublished ? 'success' : 'neutral'}>
                        {subject.isPublished ? 'Published' : 'Draft'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(subject)}>
                          Edit
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setDeleting(subject)}>
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

      <SubjectFormModal open={formOpen} subject={editing} onClose={() => setFormOpen(false)} />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete subject?"
        description={
          deleting
            ? `“${deleting.name}” will be removed. This is a soft delete; its slug stays reserved.`
            : ''
        }
        confirmLabel="Delete"
        confirmVariant="danger"
        isLoading={deleteSubject.isPending}
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
