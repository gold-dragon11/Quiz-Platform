import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from '@/stores/toast-store';
import { QuizType } from '@/shared/types/enums';
import { Alert } from '@/shared/ui/Alert';
import { Button } from '@/shared/ui/Button';
import { Checkbox } from '@/shared/ui/Checkbox';
import { Input } from '@/shared/ui/Input';
import { Modal } from '@/shared/ui/Modal';
import { Select, type SelectOption } from '@/shared/ui/Select';
import { Textarea } from '@/shared/ui/Textarea';
import { applyApiErrorToForm } from '@/shared/utils/apply-api-error';
import { useTopicsLookup } from '@/features/admin/hooks/use-admin-lookups';
import { useCreateQuiz, useUpdateQuiz } from '@/features/admin/hooks/use-admin-quizzes';
import { quizFormSchema, type QuizFormValues } from '@/features/admin/validation/admin.schemas';
import type { QuizRecord, SubjectRecord } from '@/features/admin/types/admin.types';

interface QuizFormModalProps {
  open: boolean;
  quiz?: QuizRecord;
  subjects: SubjectRecord[];
  onClose: () => void;
}

const FORM_ID = 'quiz-form';
const FIELD_MAP = { title: 'title', questioncount: 'questionCount' } as const;
const MODE_OPTIONS: SelectOption[] = [
  { value: QuizType.SUBJECT_QUIZ, label: 'Тест з предмета' },
  { value: QuizType.RANDOM_QUIZ, label: 'Випадковий тест' },
];

function toDefaults(quiz: QuizRecord | undefined): QuizFormValues {
  return {
    subjectId: quiz?.subjectId ?? '',
    topicId: quiz?.topicId ?? '',
    title: quiz?.title ?? '',
    description: quiz?.description ?? '',
    mode: quiz?.mode ?? QuizType.SUBJECT_QUIZ,
    questionCount: quiz?.questionCount ?? 10,
    timerEnabled: quiz?.timerEnabled ?? false,
    isPublished: quiz?.isPublished ?? false,
  };
}

/** Create/edit a quiz configuration (docs/04-api/admin.md §8). */
export function QuizFormModal({ open, quiz, subjects, onClose }: QuizFormModalProps): React.JSX.Element {
  const isEdit = Boolean(quiz);
  const createQuiz = useCreateQuiz();
  const updateQuiz = useUpdateQuiz();
  const pending = createQuiz.isPending || updateQuiz.isPending;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm<QuizFormValues>({
    resolver: zodResolver(quizFormSchema),
    defaultValues: toDefaults(quiz),
  });

  useEffect(() => {
    if (open) {
      reset(toDefaults(quiz));
    }
  }, [open, quiz, reset]);

  const subjectId = watch('subjectId');
  const topics = useTopicsLookup(subjectId || undefined);

  // Reset topic when the subject changes (not on initial mount).
  const prevSubjectRef = useRef(subjectId);
  useEffect(() => {
    if (prevSubjectRef.current !== subjectId) {
      prevSubjectRef.current = subjectId;
      setValue('topicId', '');
    }
  }, [subjectId, setValue]);

  const subjectOptions: SelectOption[] = [
    { value: '', label: 'Оберіть предмет…' },
    ...subjects.map((s) => ({ value: s.id, label: s.name })),
  ];
  const topicOptions: SelectOption[] = topics.isPending
    ? [{ value: '', label: 'Завантаження тем…' }]
    : [
        { value: '', label: 'No topic (whole subject)' },
        ...(topics.data ?? []).map((t) => ({ value: t.id, label: t.name })),
      ];

  const onSubmit = handleSubmit((values) => {
    if (quiz) {
      updateQuiz.mutate(
        {
          id: quiz.id,
          payload: {
            topicId: values.topicId ? values.topicId : null,
            title: values.title,
            description: values.description ? values.description : null,
            mode: values.mode,
            questionCount: values.questionCount,
            timerEnabled: values.timerEnabled,
            isPublished: values.isPublished,
          },
        },
        {
          onSuccess: () => {
            toast.success('Тест оновлено.');
            onClose();
          },
          onError: (error) => applyApiErrorToForm(error, setError, FIELD_MAP),
        },
      );
    } else {
      createQuiz.mutate(
        {
          subjectId: values.subjectId,
          topicId: values.topicId || undefined,
          title: values.title,
          description: values.description || undefined,
          mode: values.mode,
          questionCount: values.questionCount,
          timerEnabled: values.timerEnabled,
          isPublished: values.isPublished,
        },
        {
          onSuccess: () => {
            toast.success('Тест створено.');
            onClose();
          },
          onError: (error) => applyApiErrorToForm(error, setError, FIELD_MAP),
        },
      );
    }
  });

  return (
    <Modal
      open={open}
      title={isEdit ? 'Редагування тесту' : 'Новий тест'}
      onClose={onClose}
      busy={pending}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Скасувати
          </Button>
          <Button type="submit" form={FORM_ID} isLoading={pending}>
            {isEdit ? 'Зберегти зміни' : 'Створити тест'}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {errors.root && <Alert variant="error">{errors.root.message}</Alert>}
        <Select
          label="Предмет"
          options={subjectOptions}
          disabled={isEdit}
          helperText={isEdit ? "A quiz's subject cannot be changed." : undefined}
          error={errors.subjectId?.message}
          {...register('subjectId')}
        />
        <Select
          label="Тема (необовʼязково)"
          options={topicOptions}
          disabled={!subjectId || topics.isPending}
          {...register('topicId')}
        />
        <Input label="Назва" error={errors.title?.message} {...register('title')} />
        <Textarea label="Опис" error={errors.description?.message} {...register('description')} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Режим" options={MODE_OPTIONS} error={errors.mode?.message} {...register('mode')} />
          <Input
            label="Кількість питань"
            type="number"
            min={1}
            max={50}
            error={errors.questionCount?.message}
            {...register('questionCount')}
          />
        </div>
        <Checkbox label="Увімкнути таймер" {...register('timerEnabled')} />
        <Checkbox label="Опубліковано" {...register('isPublished')} />
      </form>
    </Modal>
  );
}
