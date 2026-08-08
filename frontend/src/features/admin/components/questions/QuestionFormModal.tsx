import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from '@/stores/toast-store';
import { Difficulty, QuestionType } from '@/shared/types/enums';
import { Alert } from '@/shared/ui/Alert';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Modal } from '@/shared/ui/Modal';
import { Select, type SelectOption } from '@/shared/ui/Select';
import { Textarea } from '@/shared/ui/Textarea';
import { applyApiErrorToForm } from '@/shared/utils/apply-api-error';
import { useTopicsLookup } from '@/features/admin/hooks/use-admin-lookups';
import { useCreateQuestion, useUpdateQuestion } from '@/features/admin/hooks/use-admin-questions';
import { questionScalarSchema, type QuestionScalarValues } from '@/features/admin/validation/admin.schemas';
import type {
  AnswerOptionInput,
  CreateQuestionPayload,
  QuestionRecord,
  SubjectRecord,
  UpdateQuestionPayload,
} from '@/features/admin/types/admin.types';

interface QuestionFormModalProps {
  open: boolean;
  question?: QuestionRecord;
  subjects: SubjectRecord[];
  onClose: () => void;
}

const FORM_ID = 'question-form';
const FIELD_MAP = { title: 'title', imageurl: 'imageUrl' } as const;

const TYPE_OPTIONS: SelectOption[] = [
  { value: QuestionType.SINGLE_CHOICE, label: 'Одна відповідь' },
  { value: QuestionType.MATCHING, label: 'Matching' },
];
const DIFFICULTY_OPTIONS: SelectOption[] = [
  { value: '', label: 'Без рівня' },
  { value: Difficulty.BEGINNER, label: 'Beginner' },
  { value: Difficulty.INTERMEDIATE, label: 'Intermediate' },
  { value: Difficulty.ADVANCED, label: 'Advanced' },
];

interface OptionRow {
  id?: string;
  content: string;
  imageUrl: string;
}
interface PairRow {
  leftId?: string;
  leftContent: string;
  leftImage: string;
  rightId?: string;
  rightContent: string;
  rightImage: string;
}

const emptyOption = (): OptionRow => ({ content: '', imageUrl: '' });
const emptyPair = (): PairRow => ({
  leftContent: '',
  leftImage: '',
  rightContent: '',
  rightImage: '',
});

interface ConfigPair {
  left: number;
  right: number;
}
function readConfigPairs(configuration: unknown): ConfigPair[] {
  if (!configuration || typeof configuration !== 'object') {
    return [];
  }
  const raw = (configuration as { pairs?: unknown }).pairs;
  if (!Array.isArray(raw)) {
    return [];
  }
  const pairs: ConfigPair[] = [];
  for (const entry of raw) {
    if (entry && typeof entry === 'object') {
      const left = (entry as { left?: unknown }).left;
      const right = (entry as { right?: unknown }).right;
      if (typeof left === 'number' && typeof right === 'number') {
        pairs.push({ left, right });
      }
    }
  }
  return pairs;
}

function toScalarDefaults(question: QuestionRecord | undefined): QuestionScalarValues {
  return {
    subjectId: '',
    topicId: question?.topicId ?? '',
    type: question?.type ?? QuestionType.SINGLE_CHOICE,
    title: question?.title ?? '',
    imageUrl: question?.imageUrl ?? '',
    difficulty: question?.difficulty ?? '',
  };
}

/**
 * Create/edit a question with its answers (docs/04-api/admin.md §6). Supports
 * the two implemented types. `type`, topic, and publication state are immutable
 * on edit (the backend rejects them via PUT); publishing is a separate action.
 * `explanation` is not part of the MVP contract and is not sent.
 *
 * Matching authoring uses row-pairs: each row is a left↔right pair. Options are
 * flattened with explicit orders (left = 2i, right = 2i+1) and the configuration
 * references those orders — a valid, side-disjoint matching configuration.
 */
export function QuestionFormModal({
  open,
  question,
  subjects,
  onClose,
}: QuestionFormModalProps): React.JSX.Element {
  const isEdit = Boolean(question);
  const createQuestion = useCreateQuestion();
  const updateQuestion = useUpdateQuestion();
  const pending = createQuestion.isPending || updateQuestion.isPending;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm<QuestionScalarValues>({
    resolver: zodResolver(questionScalarSchema),
    defaultValues: toScalarDefaults(question),
  });

  const [options, setOptions] = useState<OptionRow[]>([emptyOption(), emptyOption()]);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [pairs, setPairs] = useState<PairRow[]>([emptyPair(), emptyPair()]);
  const [answersError, setAnswersError] = useState<string | null>(null);

  // Initialize scalar + answer state whenever the modal opens.
  useEffect(() => {
    if (!open) {
      return;
    }
    reset(toScalarDefaults(question));
    setAnswersError(null);
    if (question?.type === QuestionType.SINGLE_CHOICE) {
      const sorted = [...question.answerOptions].sort((a, b) => a.order - b.order);
      setOptions(
        sorted.map((o) => ({
          id: o.id,
          content: o.content,
          imageUrl: o.imageUrl ?? '',
        })),
      );
      setCorrectIndex(
        Math.max(
          0,
          sorted.findIndex((o) => o.isCorrect),
        ),
      );
    } else if (question?.type === QuestionType.MATCHING) {
      const byOrder = new Map(question.answerOptions.map((o) => [o.order, o]));
      const configPairs = readConfigPairs(question.configuration);
      const rows: PairRow[] = configPairs.map((pair) => {
        const left = byOrder.get(pair.left);
        const right = byOrder.get(pair.right);
        return {
          leftId: left?.id,
          leftContent: left?.content ?? '',
          leftImage: left?.imageUrl ?? '',
          rightId: right?.id,
          rightContent: right?.content ?? '',
          rightImage: right?.imageUrl ?? '',
        };
      });
      setPairs(rows.length >= 2 ? rows : [emptyPair(), emptyPair()]);
    } else {
      setOptions([emptyOption(), emptyOption()]);
      setCorrectIndex(0);
      setPairs([emptyPair(), emptyPair()]);
    }
  }, [open, question, reset]);

  const subjectId = watch('subjectId');
  const type = watch('type');
  const topics = useTopicsLookup(subjectId || undefined);

  // Reset topic when the subject changes on create (not on initial mount).
  const prevSubjectRef = useRef(subjectId);
  useEffect(() => {
    if (prevSubjectRef.current !== subjectId) {
      prevSubjectRef.current = subjectId;
      if (!isEdit) {
        setValue('topicId', '');
      }
    }
  }, [subjectId, setValue, isEdit]);

  const subjectOptions: SelectOption[] = [
    { value: '', label: 'Оберіть предмет…' },
    ...subjects.map((s) => ({ value: s.id, label: s.name })),
  ];
  const topicOptions: SelectOption[] = topics.isPending
    ? [{ value: '', label: 'Завантаження тем…' }]
    : [
        { value: '', label: 'Оберіть тему…' },
        ...(topics.data ?? []).map((t) => ({ value: t.id, label: t.name })),
      ];

  const onSubmit = handleSubmit((values) => {
    setAnswersError(null);
    const difficulty = values.difficulty === '' ? undefined : (values.difficulty as Difficulty);

    if (values.type === QuestionType.SINGLE_CHOICE) {
      const cleaned = options.map((o) => ({
        ...o,
        content: o.content.trim(),
      }));
      if (cleaned.length < 2 || cleaned.some((o) => !o.content)) {
        setAnswersError('Додайте щонайменше два варіанти, кожен із текстом.');
        return;
      }
      if (correctIndex < 0 || correctIndex >= cleaned.length) {
        setAnswersError('Позначте правильну відповідь.');
        return;
      }
      const built: AnswerOptionInput[] = cleaned.map((o, i) => ({
        ...(o.id ? { id: o.id } : {}),
        content: o.content,
        imageUrl: isEdit ? o.imageUrl.trim() || null : o.imageUrl.trim() || undefined,
        order: i,
        isCorrect: i === correctIndex,
      }));
      submit(values, difficulty, built);
      return;
    }

    // MATCHING
    const cleanedPairs = pairs.map((p) => ({
      ...p,
      leftContent: p.leftContent.trim(),
      rightContent: p.rightContent.trim(),
    }));
    if (cleanedPairs.length < 2 || cleanedPairs.some((p) => !p.leftContent || !p.rightContent)) {
      setAnswersError('Додайте щонайменше дві пари, заповнивши обидві частини.');
      return;
    }
    const built: AnswerOptionInput[] = [];
    cleanedPairs.forEach((p, i) => {
      built.push({
        ...(p.leftId ? { id: p.leftId } : {}),
        content: p.leftContent,
        imageUrl: isEdit ? p.leftImage.trim() || null : p.leftImage.trim() || undefined,
        order: i * 2,
      });
      built.push({
        ...(p.rightId ? { id: p.rightId } : {}),
        content: p.rightContent,
        imageUrl: isEdit ? p.rightImage.trim() || null : p.rightImage.trim() || undefined,
        order: i * 2 + 1,
      });
    });
    const configuration = {
      pairs: cleanedPairs.map((_, i) => ({ left: i * 2, right: i * 2 + 1 })),
    };
    submit(values, difficulty, built, configuration);
  });

  function submit(
    values: QuestionScalarValues,
    difficulty: Difficulty | undefined,
    built: AnswerOptionInput[],
    configuration?: Record<string, unknown>,
  ): void {
    if (question) {
      const payload: UpdateQuestionPayload = {
        title: values.title,
        imageUrl: values.imageUrl.trim() || null,
        difficulty: difficulty ?? null,
        options: built,
        ...(configuration ? { configuration } : {}),
      };
      updateQuestion.mutate(
        { id: question.id, payload },
        {
          onSuccess: () => {
            toast.success('Питання оновлено.');
            onClose();
          },
          onError: (error) => handleError(error),
        },
      );
    } else {
      const payload: CreateQuestionPayload = {
        topicId: values.topicId,
        type: values.type,
        title: values.title,
        imageUrl: values.imageUrl.trim() || undefined,
        difficulty,
        options: built,
        ...(configuration ? { configuration } : {}),
      };
      createQuestion.mutate(payload, {
        onSuccess: () => {
          toast.success('Питання створено.');
          onClose();
        },
        onError: (error) => handleError(error),
      });
    }
  }

  function handleError(error: unknown): void {
    applyApiErrorToForm(error, setError, FIELD_MAP);
  }

  return (
    <Modal
      open={open}
      title={isEdit ? 'Редагування питання' : 'Нове питання'}
      onClose={onClose}
      busy={pending}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Скасувати
          </Button>
          <Button type="submit" form={FORM_ID} isLoading={pending}>
            {isEdit ? 'Зберегти зміни' : 'Створити питання'}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {errors.root && <Alert variant="error">{errors.root.message}</Alert>}

        {!isEdit && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Предмет" options={subjectOptions} {...register('subjectId')} />
            <Select
              label="Тема"
              options={topicOptions}
              disabled={!subjectId || topics.isPending}
              error={errors.topicId?.message}
              {...register('topicId')}
            />
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Тип"
            options={TYPE_OPTIONS}
            disabled={isEdit}
            helperText={isEdit ? "A question's type cannot be changed." : undefined}
            {...register('type')}
          />
          <Select label="Рівень" options={DIFFICULTY_OPTIONS} {...register('difficulty')} />
        </div>

        <Textarea label="Заголовок" error={errors.title?.message} {...register('title')} />
        <Input
          label="Посилання на зображення"
          placeholder="Необовʼязково"
          error={errors.imageUrl?.message}
          {...register('imageUrl')}
        />

        {answersError && <Alert variant="error">{answersError}</Alert>}

        {type === QuestionType.SINGLE_CHOICE ? (
          <SingleChoiceEditor
            options={options}
            correctIndex={correctIndex}
            onChange={setOptions}
            onCorrectChange={setCorrectIndex}
          />
        ) : (
          <MatchingEditor pairs={pairs} onChange={setPairs} />
        )}
      </form>
    </Modal>
  );
}

// --- Answer editors -----------------------------------------------------

function SingleChoiceEditor({
  options,
  correctIndex,
  onChange,
  onCorrectChange,
}: {
  options: OptionRow[];
  correctIndex: number;
  onChange: (options: OptionRow[]) => void;
  onCorrectChange: (index: number) => void;
}): React.JSX.Element {
  const update = (i: number, patch: Partial<OptionRow>): void =>
    onChange(options.map((o, idx) => (idx === i ? { ...o, ...patch } : o)));
  const remove = (i: number): void => {
    onChange(options.filter((_, idx) => idx !== i));
    if (correctIndex >= options.length - 1) {
      onCorrectChange(Math.max(0, options.length - 2));
    }
  };

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="text-text-secondary text-sm font-medium">Відповіді — позначте правильну</legend>
      {options.map((option, i) => (
        <div key={i} className="border-border flex flex-col gap-2 rounded-lg border p-3">
          <div className="flex items-center gap-3">
            <input
              type="radio"
              name="correct-option"
              aria-label={`Позначити варіант ${i + 1} правильним`}
              checked={correctIndex === i}
              onChange={() => onCorrectChange(i)}
              className="accent-primary size-4 shrink-0"
            />
            <input
              value={option.content}
              onChange={(e) => update(i, { content: e.target.value })}
              placeholder={`Варіант ${i + 1}`}
              className="bg-surface text-text-primary border-border focus:border-primary focus:ring-primary h-10 w-full rounded-lg border px-3 text-sm outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background"
            />
            {options.length > 2 && (
              <Button variant="ghost" size="sm" onClick={() => remove(i)}>
                Прибрати
              </Button>
            )}
          </div>
          <input
            value={option.imageUrl}
            onChange={(e) => update(i, { imageUrl: e.target.value })}
            placeholder="Посилання на зображення (необовʼязково)"
            className="bg-surface text-text-muted border-border focus:border-primary focus:ring-primary h-9 w-full rounded-lg border px-3 text-xs outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background"
          />
        </div>
      ))}
      {options.length < 20 && (
        <div>
          <Button variant="secondary" size="sm" onClick={() => onChange([...options, emptyOption()])}>
            Додати варіант
          </Button>
        </div>
      )}
    </fieldset>
  );
}

function MatchingEditor({
  pairs,
  onChange,
}: {
  pairs: PairRow[];
  onChange: (pairs: PairRow[]) => void;
}): React.JSX.Element {
  const update = (i: number, patch: Partial<PairRow>): void =>
    onChange(pairs.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  const remove = (i: number): void => onChange(pairs.filter((_, idx) => idx !== i));

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="text-text-secondary text-sm font-medium">
        Пари відповідностей — елемент ліворуч відповідає елементу праворуч у тому ж рядку
      </legend>
      {pairs.map((pair, i) => (
        <div key={i} className="border-border flex items-center gap-2 rounded-lg border p-3">
          <input
            value={pair.leftContent}
            onChange={(e) => update(i, { leftContent: e.target.value })}
            placeholder={`Ліворуч ${i + 1}`}
            className="bg-surface text-text-primary border-border focus:border-primary focus:ring-primary h-10 w-full rounded-lg border px-3 text-sm outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background"
          />
          <span className="text-text-muted shrink-0">→</span>
          <input
            value={pair.rightContent}
            onChange={(e) => update(i, { rightContent: e.target.value })}
            placeholder={`Праворуч ${i + 1}`}
            className="bg-surface text-text-primary border-border focus:border-primary focus:ring-primary h-10 w-full rounded-lg border px-3 text-sm outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background"
          />
          {pairs.length > 2 && (
            <Button variant="ghost" size="sm" onClick={() => remove(i)}>
              Прибрати
            </Button>
          )}
        </div>
      ))}
      {pairs.length < 10 && (
        <div>
          <Button variant="secondary" size="sm" onClick={() => onChange([...pairs, emptyPair()])}>
            Додати пару
          </Button>
        </div>
      )}
    </fieldset>
  );
}
