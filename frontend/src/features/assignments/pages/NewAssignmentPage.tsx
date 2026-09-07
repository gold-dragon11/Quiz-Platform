import { useState } from 'react';
import { generatePath, useNavigate, useParams } from 'react-router-dom';
import { ROUTES } from '@/shared/constants/routes';
import { toast } from '@/stores/toast-store';
import { Alert } from '@/shared/ui/Alert';
import { Button } from '@/shared/ui/Button';
import { Checkbox } from '@/shared/ui/Checkbox';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Input } from '@/shared/ui/Input';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Select, type SelectOption } from '@/shared/ui/Select';
import { Skeleton } from '@/shared/ui/Skeleton';
import { Textarea } from '@/shared/ui/Textarea';
import { pluralUk } from '@/shared/utils/format';
import { isApiError } from '@/shared/utils/apply-api-error';
import { useGroupRoster, useTeacherGroup } from '@/features/groups/hooks/use-groups';
import { useTopics } from '@/features/quiz/hooks/use-content';
import { QuestionPicker } from '@/features/assignments/components/QuestionPicker';
import { useCreateAssignment } from '@/features/assignments/hooks/use-assignments';
import {
  ExplanationVisibility,
  MAX_QUESTIONS_PER_ASSIGNMENT,
  QuestionSelectionMode,
  ScoredAttempt,
  type CreateAssignmentPayload,
} from '@/features/assignments/types/assignment.types';

const MODE_LABEL: Record<QuestionSelectionMode, string> = {
  TOPIC: 'Тема цілком',
  DIFFICULTY: 'Мікс за складністю',
  MISTAKES: 'За помилками групи',
  MANUAL: 'Вибрані питання',
};

const MODE_HINT: Record<QuestionSelectionMode, string> = {
  TOPIC: 'Система сама набере потрібну кількість питань з однієї теми.',
  DIFFICULTY: 'Ви задаєте, скільки питань кожного рівня. Тему можна не звужувати.',
  MISTAKES: 'Питання з тих тем, у яких група помиляється найчастіше. Потрібні попередні результати.',
  MANUAL: 'Ви обираєте кожне питання самі — з будь-яких тем предмета.',
};

const SCORED_OPTIONS: SelectOption[] = [
  { value: ScoredAttempt.FIRST, label: 'Перша спроба' },
  { value: ScoredAttempt.LAST, label: 'Остання спроба' },
  { value: ScoredAttempt.BEST, label: 'Найкраща спроба' },
];

const EXPLANATION_OPTIONS: SelectOption[] = [
  { value: ExplanationVisibility.IMMEDIATE, label: 'Одразу під час роботи' },
  { value: ExplanationVisibility.AFTER_SUBMIT, label: 'Після здачі' },
  { value: ExplanationVisibility.AFTER_DUE, label: 'Після дедлайну' },
];

/** `<input type="datetime-local">` speaks local time without a zone; the API wants ISO. */
function toIso(local: string): string {
  return new Date(local).toISOString();
}

/**
 * `/teacher/groups/:groupId/assignments/new` (RequireTeacher) — issuing homework.
 *
 * The longest form in the product, and deliberately so: every field on it is a
 * decision with a consequence, and the moment the assignment is issued the
 * question list and the recipient list are frozen for good. Only the title,
 * the description and the deadline can be changed afterwards, which is exactly
 * why the rest is worth getting right here.
 *
 * The form is grouped into the three questions a teacher actually asks: what
 * is in the work, when it runs, and who gets it.
 */
export function NewAssignmentPage(): React.JSX.Element {
  const { groupId = '' } = useParams();
  const navigate = useNavigate();
  const group = useTeacherGroup(groupId);
  const roster = useGroupRoster(groupId);
  const createAssignment = useCreateAssignment(groupId);

  const subjectId = group.data?.subject.id;
  const topics = useTopics(subjectId);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [openAt, setOpenAt] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [attemptsAllowed, setAttemptsAllowed] = useState(1);
  const [scoredAttempt, setScoredAttempt] = useState<ScoredAttempt>(ScoredAttempt.FIRST);
  const [explanations, setExplanations] = useState<ExplanationVisibility>(ExplanationVisibility.AFTER_SUBMIT);

  const [mode, setMode] = useState<QuestionSelectionMode>(QuestionSelectionMode.TOPIC);
  const [topicId, setTopicId] = useState('');
  const [count, setCount] = useState(10);
  const [beginner, setBeginner] = useState(4);
  const [intermediate, setIntermediate] = useState(4);
  const [advanced, setAdvanced] = useState(2);
  const [questionIds, setQuestionIds] = useState<string[]>([]);

  const [wholeGroup, setWholeGroup] = useState(true);
  const [studentIds, setStudentIds] = useState<string[]>([]);

  if (group.isPending) {
    return (
      <div className="mx-auto max-w-4xl">
        <Skeleton className="h-32" />
        <Skeleton className="mt-10 h-64" />
      </div>
    );
  }

  if (group.isError || !group.data || !subjectId) {
    return (
      <div className="mx-auto max-w-4xl">
        <EmptyState
          title="Групу не знайдено"
          description="Можливо, її вже немає або вона належить іншому викладачеві."
        />
      </div>
    );
  }

  const topicOptions: SelectOption[] = [
    { value: '', label: mode === QuestionSelectionMode.TOPIC ? 'Оберіть тему…' : 'Усі теми' },
    ...(topics.data ?? []).map((topic) => ({ value: topic.id, label: topic.name })),
  ];

  const difficultyTotal = beginner + intermediate + advanced;

  const selectionReady =
    mode === QuestionSelectionMode.TOPIC
      ? Boolean(topicId) && count >= 1
      : mode === QuestionSelectionMode.DIFFICULTY
        ? difficultyTotal >= 1 && difficultyTotal <= MAX_QUESTIONS_PER_ASSIGNMENT
        : mode === QuestionSelectionMode.MISTAKES
          ? count >= 1
          : questionIds.length >= 1;

  const recipientsReady = wholeGroup || studentIds.length >= 1;
  const canSubmit = Boolean(title.trim()) && Boolean(dueAt) && selectionReady && recipientsReady;

  const errorMessage = isApiError(createAssignment.error)
    ? createAssignment.error.message
    : createAssignment.error
      ? 'Не вдалося видати завдання. Спробуйте ще раз.'
      : null;

  function submit(event: React.FormEvent): void {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }

    const payload: CreateAssignmentPayload = {
      title: title.trim(),
      description: description.trim() || undefined,
      openAt: openAt ? toIso(openAt) : undefined,
      dueAt: toIso(dueAt),
      attemptsAllowed,
      scoredAttempt,
      explanations,
      mode,
      ...(mode === QuestionSelectionMode.TOPIC ? { topicId, count } : {}),
      ...(mode === QuestionSelectionMode.DIFFICULTY
        ? { topicId: topicId || undefined, beginner, intermediate, advanced }
        : {}),
      ...(mode === QuestionSelectionMode.MISTAKES ? { count } : {}),
      ...(mode === QuestionSelectionMode.MANUAL ? { questionIds } : {}),
      ...(wholeGroup ? {} : { studentIds }),
    };

    createAssignment.mutate(payload, {
      onSuccess: () => {
        toast.success('Завдання видано.');
        navigate(generatePath(ROUTES.teacherGroup, { groupId }));
      },
    });
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        eyebrow={`${group.data.name} · ${group.data.subject.name}`}
        title="Нове завдання"
        lead="Склад роботи й список адресатів фіксуються в момент видачі. Змінити потім можна лише назву, опис і дедлайн — решту варто вирішити тут."
      />

      <form onSubmit={submit} noValidate>
        {/* ------------------------------------------------------------ що */}
        <Section title="Що це за робота">
          <Input
            label="Назва"
            placeholder="напр. Тригонометрія: рівняння"
            maxLength={200}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
          <Textarea
            label="Опис (необовʼязково)"
            rows={3}
            maxLength={2000}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Що повторити перед роботою, на що звернути увагу."
          />
        </Section>

        {/* -------------------------------------------------------- склад */}
        <Section title="Склад роботи">
          <div className="flex flex-col gap-2">
            {(Object.keys(MODE_LABEL) as QuestionSelectionMode[]).map((value) => (
              <label key={value} className="flex cursor-pointer items-start gap-3">
                <input
                  type="radio"
                  name="mode"
                  value={value}
                  checked={mode === value}
                  onChange={() => setMode(value)}
                  className="accent-primary mt-1 h-4 w-4"
                />
                <span>
                  <span className="text-text-primary block text-sm font-medium">{MODE_LABEL[value]}</span>
                  <span className="text-text-muted block text-xs">{MODE_HINT[value]}</span>
                </span>
              </label>
            ))}
          </div>

          <div className="border-border mt-6 border-l pl-5">
            {mode === QuestionSelectionMode.TOPIC && (
              <div className="flex flex-col gap-4 sm:flex-row">
                <div className="sm:w-64">
                  <Select
                    label="Тема"
                    options={topicOptions}
                    value={topicId}
                    onChange={(event) => setTopicId(event.target.value)}
                  />
                </div>
                <div className="sm:w-40">
                  <NumberField label="Питань" value={count} min={1} max={50} onChange={setCount} />
                </div>
              </div>
            )}

            {mode === QuestionSelectionMode.DIFFICULTY && (
              <div className="flex flex-col gap-4">
                <div className="sm:w-64">
                  <Select
                    label="Тема (необовʼязково)"
                    options={topicOptions}
                    value={topicId}
                    onChange={(event) => setTopicId(event.target.value)}
                  />
                </div>
                <div className="grid grid-cols-3 gap-3 sm:max-w-md">
                  <NumberField label="Початковий" value={beginner} min={0} max={50} onChange={setBeginner} />
                  <NumberField
                    label="Середній"
                    value={intermediate}
                    min={0}
                    max={50}
                    onChange={setIntermediate}
                  />
                  <NumberField label="Високий" value={advanced} min={0} max={50} onChange={setAdvanced} />
                </div>
                <p className="text-text-muted text-xs">
                  Разом {difficultyTotal} {pluralUk(difficultyTotal, 'питання', 'питання', 'питань')}
                </p>
              </div>
            )}

            {mode === QuestionSelectionMode.MISTAKES && (
              <div className="sm:w-40">
                <NumberField label="Питань" value={count} min={1} max={50} onChange={setCount} />
              </div>
            )}

            {mode === QuestionSelectionMode.MANUAL && (
              <QuestionPicker subjectId={subjectId} selected={questionIds} onChange={setQuestionIds} />
            )}
          </div>
        </Section>

        {/* ---------------------------------------------------------- коли */}
        <Section title="Коли і як">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              type="datetime-local"
              label="Відкрити (необовʼязково)"
              helperText="Порожньо — доступне одразу"
              value={openAt}
              onChange={(event) => setOpenAt(event.target.value)}
            />
            <Input
              type="datetime-local"
              label="Дедлайн"
              helperText="Пізню роботу приймають — вона просто позначається як пізня"
              value={dueAt}
              onChange={(event) => setDueAt(event.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <NumberField
              label="Спроб"
              value={attemptsAllowed}
              min={1}
              max={10}
              onChange={setAttemptsAllowed}
            />
            <Select
              label="Зараховується"
              options={SCORED_OPTIONS}
              value={scoredAttempt}
              disabled={attemptsAllowed === 1}
              onChange={(event) => setScoredAttempt(event.target.value as ScoredAttempt)}
            />
            <Select
              label="Пояснення"
              options={EXPLANATION_OPTIONS}
              value={explanations}
              onChange={(event) => setExplanations(event.target.value as ExplanationVisibility)}
            />
          </div>
        </Section>

        {/* ---------------------------------------------------------- кому */}
        <Section title="Кому">
          <div className="flex flex-col gap-2">
            <label className="flex cursor-pointer items-center gap-3 text-sm">
              <input
                type="radio"
                name="recipients"
                checked={wholeGroup}
                onChange={() => setWholeGroup(true)}
                className="accent-primary h-4 w-4"
              />
              Усій групі
            </label>
            <label className="flex cursor-pointer items-center gap-3 text-sm">
              <input
                type="radio"
                name="recipients"
                checked={!wholeGroup}
                onChange={() => setWholeGroup(false)}
                className="accent-primary h-4 w-4"
              />
              Окремим учням
            </label>
          </div>

          <p className="text-text-muted text-xs">
            Список адресатів фіксується зараз: той, хто приєднається до групи пізніше, цього завдання не
            отримає.
          </p>

          {!wholeGroup && (
            <div className="border-border mt-2 border-l pl-5">
              {roster.isPending ? (
                <Skeleton className="h-24" />
              ) : roster.isError || roster.data.length === 0 ? (
                <p className="text-text-muted text-sm">У групі поки нікого.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {roster.data.map((student) => (
                    <li key={student.id}>
                      <Checkbox
                        checked={studentIds.includes(student.id)}
                        onChange={() =>
                          setStudentIds((current) =>
                            current.includes(student.id)
                              ? current.filter((id) => id !== student.id)
                              : [...current, student.id],
                          )
                        }
                        label={student.displayName ?? student.username ?? '—'}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </Section>

        {errorMessage && (
          <Alert variant="error" className="mt-8">
            {errorMessage}
          </Alert>
        )}

        <div className="mt-10 flex gap-3">
          <Button type="submit" disabled={!canSubmit} isLoading={createAssignment.isPending}>
            Видати завдання
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate(generatePath(ROUTES.teacherGroup, { groupId }))}
          >
            Скасувати
          </Button>
        </div>
      </form>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <section className="mt-14">
      <h2 className="text-text-muted border-border border-b pb-3 text-xs tracking-[0.18em] uppercase">
        {title}
      </h2>
      <div className="mt-6 flex flex-col gap-5">{children}</div>
    </section>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}): React.JSX.Element {
  return (
    <Input
      type="number"
      label={label}
      min={min}
      max={max}
      value={String(value)}
      onChange={(event) => {
        const parsed = Number.parseInt(event.target.value, 10);
        onChange(Number.isNaN(parsed) ? min : Math.min(Math.max(parsed, min), max));
      }}
    />
  );
}
