import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { generatePath, useNavigate, useSearchParams } from 'react-router-dom';
import { ROUTES } from '@/shared/constants/routes';
import { Alert } from '@/shared/ui/Alert';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Checkbox } from '@/shared/ui/Checkbox';
import { EmptyState } from '@/shared/ui/EmptyState';
import { SectionHeader } from '@/shared/ui/SectionHeader';
import { Select, type SelectOption } from '@/shared/ui/Select';
import { Skeleton } from '@/shared/ui/Skeleton';
import { applyApiErrorToForm } from '@/shared/utils/apply-api-error';
import { pluralUk } from '@/shared/utils/format';
import { useSubjects, useTopics } from '@/features/quiz/hooks/use-content';
import { useStartQuiz } from '@/features/quiz/hooks/use-quiz';
import { startQuizSchema, type StartQuizFormValues } from '@/features/quiz/validation/quiz.schemas';

const QUESTION_COUNT_OPTIONS: SelectOption[] = [5, 10, 15, 20, 25].map((n) => ({
  value: String(n),
  label: `${n} ${pluralUk(n, 'питання', 'питання', 'питань')}`,
}));

/**
 * `/quiz` (RequireAuth). Configures and starts an ad-hoc quiz
 * (docs/04-api/quiz.md §4): subject (required), topic (optional → random /
 * subject-wide), question count, and timer. Start is disabled until valid;
 * backend rules (one active session → 409, too few questions → 409) surface
 * inline. On success it navigates to the new session.
 *
 * The subjects browser deep-links here with `?subjectId=…&topicId=…` to
 * prefill the form (Phase 6.7) — the user still reviews question count / timer
 * and presses Start, so the Quiz Start flow is never bypassed.
 */
export function QuizStartPage(): React.JSX.Element {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prefillSubjectId = searchParams.get('subjectId') ?? '';
  const prefillTopicId = searchParams.get('topicId') ?? '';
  const subjects = useSubjects();
  const startQuiz = useStartQuiz();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors, isValid },
  } = useForm<StartQuizFormValues>({
    resolver: zodResolver(startQuizSchema),
    mode: 'onChange',
    defaultValues: {
      subjectId: prefillSubjectId,
      topicId: '',
      questionCount: 10,
      timerEnabled: false,
    },
  });

  const subjectId = watch('subjectId');
  const topics = useTopics(subjectId || undefined);

  // Reset the chosen topic when the subject actually changes (not on the
  // initial mount, so a prefilled topic survives).
  const prevSubjectRef = useRef(prefillSubjectId);
  const prefillAppliedRef = useRef(false);
  useEffect(() => {
    if (prevSubjectRef.current !== subjectId) {
      prevSubjectRef.current = subjectId;
      setValue('topicId', '');
      prefillAppliedRef.current = true; // user-driven change: skip prefill
    }
  }, [subjectId, setValue]);

  // Apply the prefilled topic once its subject's topics have loaded.
  useEffect(() => {
    if (
      !prefillAppliedRef.current &&
      prefillTopicId &&
      topics.data?.some((topic) => topic.id === prefillTopicId)
    ) {
      prefillAppliedRef.current = true;
      setValue('topicId', prefillTopicId, { shouldValidate: true });
    }
  }, [topics.data, prefillTopicId, setValue]);

  const onSubmit = handleSubmit((values) => {
    startQuiz.mutate(
      {
        subjectId: values.subjectId,
        topicId: values.topicId ? values.topicId : undefined,
        questionCount: values.questionCount,
        timerEnabled: values.timerEnabled,
      },
      {
        onSuccess: (session) =>
          navigate(
            generatePath(ROUTES.quizSession, {
              sessionId: session.sessionId,
            }),
          ),
        onError: (error) => applyApiErrorToForm(error, setError),
      },
    );
  });

  const subjectOptions: SelectOption[] = [
    { value: '', label: 'Оберіть предмет…' },
    ...(subjects.data ?? []).map((subject) => ({
      value: subject.id,
      label: subject.name,
    })),
  ];

  const topicOptions: SelectOption[] = topics.isPending
    ? [{ value: '', label: 'Завантаження тем…' }]
    : [
        { value: '', label: 'Усі теми (випадково)' },
        ...(topics.data ?? []).map((topic) => ({
          value: topic.id,
          label: topic.name,
        })),
      ];

  return (
    <div className="mx-auto max-w-xl">
      <SectionHeader title="Почати тест" description="Оберіть, що тренувати й скільки це триватиме." />
      <Card>
        {subjects.isPending ? (
          <div className="flex flex-col gap-4">
            <Skeleton className="h-11 w-full rounded-lg" />
            <Skeleton className="h-11 w-full rounded-lg" />
            <Skeleton className="h-11 w-full rounded-lg" />
            <Skeleton className="h-11 w-32 rounded-lg" />
          </div>
        ) : subjects.isError ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <p className="text-text-muted text-sm">Не вдалося завантажити предмети.</p>
            <Button variant="secondary" size="sm" onClick={() => void subjects.refetch()}>
              Спробувати ще раз
            </Button>
          </div>
        ) : subjects.data.length === 0 ? (
          <EmptyState
            title="Тест недоступний"
            description="Опублікованих предметів для тестування поки немає. Зазирніть трохи згодом."
          />
        ) : (
          <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
            {errors.root && <Alert variant="error">{errors.root.message}</Alert>}

            <Select
              label="Предмет"
              options={subjectOptions}
              error={errors.subjectId?.message}
              {...register('subjectId')}
            />

            <Select
              label="Тема (необовʼязково)"
              helperText="Залиште «Усі теми», щоб отримати випадковий тест з усього предмета."
              options={topicOptions}
              disabled={!subjectId || topics.isPending}
              {...register('topicId')}
            />

            <Select
              label="Кількість питань"
              options={QUESTION_COUNT_OPTIONS}
              error={errors.questionCount?.message}
              {...register('questionCount')}
            />

            <Checkbox label="Увімкнути таймер (60 секунд на питання)" {...register('timerEnabled')} />

            <Button type="submit" fullWidth isLoading={startQuiz.isPending} disabled={!isValid}>
              Почати тест
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
