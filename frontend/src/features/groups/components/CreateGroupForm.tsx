import { useState } from 'react';
import { Alert } from '@/shared/ui/Alert';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Select, type SelectOption } from '@/shared/ui/Select';
import { isApiError } from '@/shared/utils/apply-api-error';
import { useSubjects } from '@/features/quiz/hooks/use-content';
import { useCreateGroup } from '@/features/groups/hooks/use-groups';

/**
 * Creating a group: a name and a subject, on one line.
 *
 * The subject is required and fixed for good — a group belongs to one subject
 * so the assignment builder and the group analytics read unambiguously. A
 * teacher taking the same children through two subjects keeps two groups, and
 * saying so here saves them discovering it later.
 */
export function CreateGroupForm(): React.JSX.Element {
  const subjects = useSubjects();
  const createGroup = useCreateGroup();
  const [name, setName] = useState('');
  const [subjectId, setSubjectId] = useState('');

  const options: SelectOption[] = [
    { value: '', label: 'Оберіть предмет…' },
    ...(subjects.data ?? []).map((subject) => ({ value: subject.id, label: subject.name })),
  ];

  const errorMessage = isApiError(createGroup.error)
    ? createGroup.error.message
    : createGroup.error
      ? 'Не вдалося створити групу. Спробуйте ще раз.'
      : null;

  function submit(event: React.FormEvent): void {
    event.preventDefault();
    if (!name.trim() || !subjectId) {
      return;
    }
    createGroup.mutate(
      { name: name.trim(), subjectId },
      {
        onSuccess: () => {
          setName('');
          setSubjectId('');
        },
      },
    );
  }

  return (
    <form onSubmit={submit} noValidate>
      {errorMessage && (
        <Alert variant="error" className="mb-5">
          {errorMessage}
        </Alert>
      )}

      {/* The row aligns on the bottom edge of the fields. The subject select
          used to carry its own helper line underneath, so `items-end` matched
          the bottom of that *hint* to the bottom of the name input — lifting
          the select itself by a line and leaving the button on a third level.
          The note now sits under the whole row, where it also reads as being
          about the group rather than about the dropdown. */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="sm:flex-1">
          <Input
            label="Назва групи"
            placeholder="напр. 11-А, підготовка до НМТ"
            maxLength={100}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        <div className="sm:w-56">
          <Select
            label="Предмет"
            options={options}
            value={subjectId}
            onChange={(event) => setSubjectId(event.target.value)}
          />
        </div>
        <Button type="submit" disabled={!name.trim() || !subjectId} isLoading={createGroup.isPending}>
          Створити
        </Button>
      </div>

      <p className="text-text-muted mt-3 text-xs">
        Предмет групи змінити згодом не можна — для іншого предмета створіть окрему групу.
      </p>
    </form>
  );
}
