import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { generatePath, useNavigate, useSearchParams } from 'react-router-dom';
import { ROUTES } from '@/shared/constants/routes';
import { Alert } from '@/shared/ui/Alert';
import { Button } from '@/shared/ui/Button';
import { Checkbox } from '@/shared/ui/Checkbox';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Select, type SelectOption } from '@/shared/ui/Select';
import { Skeleton } from '@/shared/ui/Skeleton';
import { applyApiErrorToForm } from '@/shared/utils/apply-api-error';
import { pluralUk } from '@/shared/utils/format';
import { ActiveQuizBanner } from '@/features/quiz/components/ActiveQuizBanner';
import { useSubjects, useTopics } from '@/features/quiz/hooks/use-content';
import { useActiveQuiz, useAvailableQuestions, useStartQuiz } from '@/features/quiz/hooks/use-quiz';
import { startQuizSchema, type StartQuizFormValues } from '@/features/quiz/validation/quiz.schemas';

/** The sizes offered, before the pool is known to be smaller. */
const COUNT_LADDER = [5, 10, 15, 20, 25];

/**
 * Seconds the backend grants per question (`SECONDS_PER_QUESTION` in
 * quiz.service.ts). It budgets `60 × questionCount` for the *session*, not for
 * each question in turn — see the timer copy below.
 */
const SECONDS_PER_QUESTION = 60;

function countLabel(n: number): string {
  return `${n} ${pluralUk(n, 'питання', 'питання', 'питань')}`;
}

/**
 * `/quiz` (RequireAuth). Configures and starts an ad-hoc quiz
 * (docs/04-api/quiz.md §4): subject (required), topic (optional → random /
 * subject-wide), question count, and timer.
 *
 * The subjects browser deep-links here with `?subjectId=…&topicId=…` to
 * prefill the form (Phase 6.7) — the reader still reviews question count and
 * timer and presses Start, so the flow is never bypassed.
 *
 * Two things this screen used to get wrong, both of them about telling the
 * truth before the reader commits:
 *
 * - it offered 25 questions on a topic that holds seven, and the only way to
 *   find out was a 409 after pressing Start. `GET /quiz/available` (§4a)
 *   exists precisely to size the choice in advance and nothing had ever
 *   called it; the ladder is now cut to the pool, and a subject with nothing
 *   published says so instead of failing;
 * - the timer was labelled «60 секунд на питання», which reads as a per
 *   question limit that moves you on when it runs out. The backend grants one
 *   shared budget of 60 × count for the whole session, spendable however the
 *   reader likes. The label now states the total, in minutes.
 *
 * Start is also disabled while a session is already open, rather than letting
 * the press come back as a 409 restating the banner directly above it.
 */
export function QuizStartPage(): React.JSX.Element {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prefillSubjectId = searchParams.get('subjectId') ?? '';
  const prefillTopicId = searchParams.get('topicId') ?? '';
  const subjects = useSubjects();
  const startQuiz = useStartQuiz();
  const activeQuiz = useActiveQuiz();

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
  const topicId = watch('topicId');
  const questionCount = watch('questionCount');
  const topics = useTopics(subjectId || undefined);
  const available = useAvailableQuestions(subjectId, topicId);

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

  const pool = available.data;
  const countOptions = buildCountOptions(pool);

  // Switching to a narrower topic can leave a count the pool cannot fill. Pull
  // it down to the largest that fits rather than letting Start earn a 409.
  useEffect(() => {
    if (pool === undefined || pool === 0 || countOptions.length === 0) {
      return;
    }
    const largest = countOptions[countOptions.length - 1];
    if (questionCount > largest) {
      setValue('questionCount', largest, { shouldValidate: true });
    }
  }, [pool, countOptions, questionCount, setValue]);

  const onSubmit = handleSubmit((values) => {
    startQuiz.mutate(
      {
        subjectId: values.subjectId,
        topicId: values.topicId ? values.topicId : undefined,
        questionCount: values.questionCount,
        timerEnabled: values.timerEnabled,
      },
      {
        onSuccess: (session) => navigate(generatePath(ROUTES.quizSession, { sessionId: session.sessionId })),
        onError: (error) => applyApiErrorToForm(error, setError),
      },
    );
  });

  const subjectOptions: SelectOption[] = [
    { value: '', label: 'Оберіть предмет…' },
    ...(subjects.data ?? []).map((subject) => ({ value: subject.id, label: subject.name })),
  ];

  // A query that waits for a subject counts as pending too, so without the
  // first check an empty form claimed to be loading topics it never asked for.
  const topicOptions: SelectOption[] = !subjectId
    ? [{ value: '', label: 'Спочатку оберіть предмет' }]
    : topics.isPending
      ? [{ value: '', label: 'Завантаження тем…' }]
      : [
          { value: '', label: 'Усі теми (випадково)' },
          ...(topics.data ?? []).map((topic) => ({ value: topic.id, label: topic.name })),
        ];

  const emptyPool = subjectId !== '' && pool === 0;
  const minutes = Math.round((SECONDS_PER_QUESTION * questionCount) / 60);
  // One session at a time is a backend rule. Pressing Start with one already
  // open earned a red 409 that said, in different words, exactly what the
  // banner above it had just said — so the button is simply not offered.
  const hasActiveSession = Boolean(activeQuiz.data);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        eyebrow="Тренування"
        title="Тест"
        lead="Оберіть предмет і тему — або лишіть усі теми, щоб питання добиралися з усього предмета."
      />

      <ActiveQuizBanner className="mt-10" />

      {subjects.isPending ? (
        <div className="mt-12 flex flex-col gap-8">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : subjects.isError ? (
        <p className="border-error text-text-secondary mt-12 border-l pl-5 text-sm">
          Не вдалося завантажити предмети.{' '}
          <button
            type="button"
            onClick={() => void subjects.refetch()}
            className="text-primary underline underline-offset-4"
          >
            Спробувати ще раз
          </button>
        </p>
      ) : subjects.data.length === 0 ? (
        <p className="border-border text-text-secondary mt-12 max-w-xl border-l pl-5 text-sm">
          Опублікованих предметів для тестування поки немає. Зазирніть трохи згодом.
        </p>
      ) : (
        <form onSubmit={onSubmit} noValidate className="mt-12 flex flex-col gap-8">
          {errors.root && <Alert variant="error">{errors.root.message}</Alert>}

          <Select
            label="Предмет"
            options={subjectOptions}
            error={errors.subjectId?.message}
            {...register('subjectId')}
          />

          <Select
            label="Тема"
            // Explains the option that is actually selected. Left on
            // permanently it described «Усі теми» while a named topic sat in
            // the field — a hint about a state the reader is not in.
            helperText={topicId === '' ? 'Питання беруться з усіх тем предмета, вперемішку.' : undefined}
            options={topicOptions}
            disabled={!subjectId || topics.isPending}
            {...register('topicId')}
          />

          {emptyPool ? (
            <p className="border-warning text-text-secondary max-w-xl border-l pl-5 text-sm">
              Тут поки немає опублікованих питань. Оберіть іншу тему або «Усі теми».
            </p>
          ) : (
            <>
              <Select
                label="Скільки питань"
                helperText={poolHint(pool, subjectId)}
                options={countOptions.map((n) => ({ value: String(n), label: countLabel(n) }))}
                error={errors.questionCount?.message}
                {...register('questionCount')}
              />

              <div>
                <Checkbox label={`Обмежити час: ${minutes} хв на весь тест`} {...register('timerEnabled')} />
                <p className="text-text-muted mt-2 text-xs">
                  Це спільний запас на всю роботу, а не на кожне питання окремо — на складному можна
                  затриматись, якщо надолужити на легких.
                </p>
              </div>
            </>
          )}

          <div>
            <Button
              type="submit"
              isLoading={startQuiz.isPending}
              disabled={!isValid || emptyPool || hasActiveSession}
            >
              Почати тест
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

/**
 * The ladder, cut to what the pool can actually fill. A pool smaller than the
 * first rung still gets one option — its own size — so a topic with three
 * questions is testable rather than merely disappointing.
 */
function buildCountOptions(pool: number | undefined): number[] {
  if (pool === undefined) {
    return COUNT_LADDER;
  }
  if (pool === 0) {
    return [];
  }
  const fitting = COUNT_LADDER.filter((n) => n <= pool);
  return fitting.length > 0 ? fitting : [pool];
}

/**
 * Says what the pool actually is, and only claims the ladder was cut when it
 * was. The first version announced «Рахуємо…» before a subject was even
 * chosen — with the query disabled, so nothing was being counted — and then
 * told a reader looking at a pool of 41 that we could offer no more than 25,
 * which was a limit of ours, not of the bank.
 */
function poolHint(pool: number | undefined, subjectId: string): string | undefined {
  if (!subjectId) {
    return 'Спочатку оберіть предмет.';
  }
  if (pool === undefined) {
    return 'Рахуємо, скільки питань доступно…';
  }
  const largestRung = COUNT_LADDER[COUNT_LADDER.length - 1];
  return pool < largestRung
    ? `Тут лише ${countLabel(pool)} — це весь вибір.`
    : `Усього тут ${countLabel(pool)}.`;
}
