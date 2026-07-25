import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { generatePath, useNavigate } from 'react-router-dom';
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
import { useSubjects, useTopics } from '@/features/quiz/hooks/use-content';
import { useStartQuiz } from '@/features/quiz/hooks/use-quiz';
import { startQuizSchema, type StartQuizFormValues } from '@/features/quiz/validation/quiz.schemas';

const QUESTION_COUNT_OPTIONS: SelectOption[] = [5, 10, 15, 20, 25].map((n) => ({
  value: String(n),
  label: `${n} questions`,
}));

/**
 * `/quiz` (RequireAuth). Configures and starts an ad-hoc quiz
 * (docs/04-api/quiz.md §4): subject (required), topic (optional → random /
 * subject-wide), question count, and timer. Start is disabled until valid;
 * backend rules (one active session → 409, too few questions → 409) surface
 * inline. On success it navigates to the new session.
 */
export function QuizStartPage(): React.JSX.Element {
  const navigate = useNavigate();
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
      subjectId: '',
      topicId: '',
      questionCount: 10,
      timerEnabled: false,
    },
  });

  const subjectId = watch('subjectId');
  const topics = useTopics(subjectId || undefined);

  // Reset the chosen topic whenever the subject changes.
  useEffect(() => {
    setValue('topicId', '');
  }, [subjectId, setValue]);

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
    { value: '', label: 'Select a subject…' },
    ...(subjects.data ?? []).map((subject) => ({
      value: subject.id,
      label: subject.name,
    })),
  ];

  const topicOptions: SelectOption[] = topics.isPending
    ? [{ value: '', label: 'Loading topics…' }]
    : [
        { value: '', label: 'All topics (random)' },
        ...(topics.data ?? []).map((topic) => ({
          value: topic.id,
          label: topic.name,
        })),
      ];

  return (
    <div className="mx-auto max-w-xl">
      <SectionHeader title="Start a quiz" description="Pick what to practice and how long to spend." />
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
            <p className="text-text-muted text-sm">We couldn&apos;t load the subjects.</p>
            <Button variant="secondary" size="sm" onClick={() => void subjects.refetch()}>
              Try again
            </Button>
          </div>
        ) : subjects.data.length === 0 ? (
          <EmptyState
            title="Quiz unavailable"
            description="There are no published subjects to quiz on yet. Please check back later."
          />
        ) : (
          <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
            {errors.root && <Alert variant="error">{errors.root.message}</Alert>}

            <Select
              label="Subject"
              options={subjectOptions}
              error={errors.subjectId?.message}
              {...register('subjectId')}
            />

            <Select
              label="Topic (optional)"
              helperText="Leave on “All topics” for a random subject-wide quiz."
              options={topicOptions}
              disabled={!subjectId || topics.isPending}
              {...register('topicId')}
            />

            <Select
              label="Number of questions"
              options={QUESTION_COUNT_OPTIONS}
              error={errors.questionCount?.message}
              {...register('questionCount')}
            />

            <Checkbox label="Enable timer (60 seconds per question)" {...register('timerEnabled')} />

            <Button type="submit" fullWidth isLoading={startQuiz.isPending} disabled={!isValid}>
              Start quiz
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
