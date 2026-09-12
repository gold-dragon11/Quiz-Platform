import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { generatePath, useNavigate, useParams } from 'react-router-dom';
import { ROUTES } from '@/shared/constants/routes';
import { slideSwap, TRANSITION } from '@/shared/constants/motion';
import { toast } from '@/stores/toast-store';
import { Button } from '@/shared/ui/Button';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { Skeleton } from '@/shared/ui/Skeleton';
import { Spinner } from '@/shared/ui/Spinner';
import { isApiError } from '@/shared/utils/apply-api-error';
import { QuestionType, QuizStatus } from '@/shared/types/enums';
import { useQuizSession, useSubmitAnswer, useCompleteQuiz } from '@/features/quiz/hooks/use-quiz';
import type { SelectedAnswer } from '@/features/quiz/types/quiz.types';
import { QuestionCard } from '@/features/quiz/components/QuestionCard';
import { QuestionStrip } from '@/features/quiz/components/QuestionStrip';
import { PassagePanel } from '@/features/quiz/components/PassagePanel';
import { QuizTimer } from '@/features/quiz/components/QuizTimer';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

/**
 * `/quiz/:sessionId` (RequireAuth). The full quiz runtime (docs/04-api/quiz.md
 * §5-7, §9): loads the resume state, renders the current question, autosaves
 * every answer to the backend (never only locally), supports back/next
 * navigation, shows the timer when enabled, and completes the quiz. Reconnects
 * reload via the resume query; an already-completed session redirects to the
 * result.
 *
 * Finishing is available from any question, not only the last one. It used to
 * appear solely in place of «Далі» on the final card, so a reader who had
 * answered everything and was re-checking question three had to page all the
 * way to the end to hand the work in — and the question strip above exists
 * precisely so nobody has to page anywhere.
 */
export function QuizSessionPage(): React.JSX.Element {
  const { sessionId = '' } = useParams();
  const navigate = useNavigate();
  const session = useQuizSession(sessionId);
  const submitAnswer = useSubmitAnswer(sessionId);
  const complete = useCompleteQuiz(sessionId);

  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, SelectedAnswer>>({});
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const initializedRef = useRef(false);
  const redirectedRef = useRef(false);

  const resultPath = generatePath(ROUTES.quizResult, { sessionId });

  const goToResult = useCallback(() => {
    if (!redirectedRef.current) {
      redirectedRef.current = true;
      navigate(resultPath, { replace: true });
    }
  }, [navigate, resultPath]);

  // Initialize local answers once from the resumed session; redirect if it is
  // already completed.
  useEffect(() => {
    if (!session.data || initializedRef.current) {
      return;
    }
    initializedRef.current = true;
    if (session.data.session.status === QuizStatus.COMPLETED) {
      goToResult();
      return;
    }
    const initial: Record<string, SelectedAnswer> = {};
    for (const saved of session.data.answers) {
      initial[saved.questionId] = saved.selectedAnswer;
    }
    setAnswers(initial);
  }, [session.data, goToResult]);

  const handleInactive = useCallback(
    (error: unknown) => {
      if (isApiError(error) && error.status === 404) {
        toast.error('Цю сесію тесту не знайдено.');
        navigate(ROUTES.quiz, { replace: true });
        return;
      }
      // 409 → the session is no longer active (completed or timed out).
      toast.info('Цей тест уже неактивний.');
      goToResult();
    },
    [navigate, goToResult],
  );

  const handleAnswerChange = (questionId: string, selectedAnswer: SelectedAnswer): void => {
    setAnswers((prev) => ({ ...prev, [questionId]: selectedAnswer }));
    setSaveStatus('saving');
    submitAnswer.mutate(
      { questionId, selectedAnswer },
      {
        onSuccess: () => setSaveStatus('saved'),
        onError: (error) => {
          setSaveStatus('error');
          if (isApiError(error) && (error.status === 409 || error.status === 404)) {
            handleInactive(error);
          } else if (isApiError(error)) {
            toast.error(error.message);
          }
        },
      },
    );
  };

  const handleComplete = useCallback(() => {
    setConfirmOpen(false);
    complete.mutate(undefined, {
      onSuccess: () => goToResult(),
      onError: (error) => {
        // Already completed (e.g. timer expiry auto-completed it) → the result
        // still exists.
        if (isApiError(error) && error.status === 409) {
          goToResult();
        } else if (isApiError(error)) {
          toast.error(error.message);
        }
      },
    });
  }, [complete, goToResult]);

  // --- Loading / empty / error states -----------------------------------

  if (session.isPending) {
    return <SessionSkeleton />;
  }

  if (session.isError) {
    const notFound = isApiError(session.error) && session.error.status === 404;
    return (
      <div className="mx-auto max-w-2xl">
        <p className="border-error text-text-secondary max-w-xl border-l pl-5 text-sm">
          {notFound ? (
            <>
              Такої сесії тесту не існує або вона більше недоступна.{' '}
              <button
                type="button"
                onClick={() => navigate(ROUTES.quiz)}
                className="text-primary underline underline-offset-4"
              >
                Почати новий
              </button>
            </>
          ) : (
            <>
              Не вдалося завантажити цю сесію тесту.{' '}
              <button
                type="button"
                onClick={() => void session.refetch()}
                className="text-primary underline underline-offset-4"
              >
                Спробувати ще раз
              </button>
            </>
          )}
        </p>
      </div>
    );
  }

  const { session: meta, questions } = session.data;

  if (meta.status === QuizStatus.COMPLETED) {
    // The initialization effect redirects; render a brief loader meanwhile.
    return <SessionSkeleton />;
  }

  if (questions.length === 0) {
    return (
      <div className="mx-auto max-w-2xl">
        <p className="border-border text-text-secondary max-w-xl border-l pl-5 text-sm">
          У цій сесії немає жодного питання — показувати нічого.{' '}
          <button
            type="button"
            onClick={() => navigate(ROUTES.quiz)}
            className="text-primary underline underline-offset-4"
          >
            Почати новий тест
          </button>
        </p>
      </div>
    );
  }

  const total = questions.length;
  const current = questions[index];
  // A mock sitting numbers its questions as the paper does and prints the
  // paper's instruction above each run of tasks. A joint block sets its papers
  // one after another, each numbered from 1.
  const sitting = session.data.sitting;
  const paper = sitting?.papers.find((entry) => index >= entry.start && index < entry.start + entry.count);
  const taskNumber = sitting?.taskNumbers[index] ?? null;
  // A task that carries a run of the answer sheet — English «11–16», «17–22» —
  // numbers its rows and its gaps as the paper does, because its instruction
  // names those numbers. Everywhere else a task is one row and counts from 1.
  const taskRun = sitting?.taskLabels[index]?.split('–') ?? [];
  const runFrom = taskRun.length === 2 ? Number(taskRun[0]) : 1;
  const section =
    taskNumber === null
      ? undefined
      : paper?.sections.find((range) => range.from <= taskNumber && taskNumber <= range.to);
  const answeredCount = questions.filter((q) => answers[q.id] !== undefined).length;
  const isLast = index === total - 1;
  const unanswered = total - answeredCount;

  return (
    // A question on a text needs the text beside it, so the page widens for
    // it; everything else keeps the narrow reading column.
    <div className={`mx-auto flex flex-col gap-8 ${current.passage ? 'max-w-6xl' : 'max-w-2xl'}`}>
      <div className="flex items-start gap-6">
        <div className="min-w-0 flex-1">
          <QuestionStrip
            total={total}
            index={index}
            answered={questions.map((question) => answers[question.id] !== undefined)}
            onJump={setIndex}
            numbers={sitting?.taskLabels}
            noun={sitting ? 'Завдання' : undefined}
            groups={
              sitting && sitting.papers.length > 1
                ? sitting.papers.map((entry) => ({
                    label: entry.subjectName,
                    start: entry.start,
                    count: entry.count,
                  }))
                : undefined
            }
          />
        </div>
        {meta.timerEnabled && meta.expiresAt && (
          <QuizTimer expiresAt={meta.expiresAt} onExpire={handleComplete} />
        )}
      </div>

      {section && (
        <p className="border-border text-text-secondary max-w-3xl border-l pl-5 text-sm">
          {section.instruction}
        </p>
      )}

      {/* The text stays put while the questions on it change: it is keyed by the
          passage, not the question, so paging from gap 2 to gap 3 moves only
          the marked gap and keeps the reader's place in a long text. */}
      <div className={current.passage ? 'grid gap-8 lg:grid-cols-2 lg:gap-12' : ''}>
        {/* The rule sits on a wrapper, a little below the scrolling text: on a
            phone the text is cut mid-line at the bottom of its box, and a line
            drawn straight under that half-shown row reads as a strikethrough. */}
        {current.passage && (
          <div className="border-border border-b pb-4 lg:sticky lg:top-6 lg:self-start lg:border-r lg:border-b-0 lg:pr-10 lg:pb-0">
            <PassagePanel
              key={current.passage.id}
              passage={current.passage}
              activeGap={current.type === QuestionType.MATCHING ? null : current.passageOrder}
              numberFrom={runFrom}
              className="max-h-[45vh] overflow-y-auto lg:max-h-[calc(100vh-10rem)]"
            />
          </div>
        )}
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            variants={slideSwap}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={TRANSITION.fade}
          >
            <QuestionCard
              question={current}
              answer={answers[current.id]}
              disabled={complete.isPending}
              onAnswerChange={(selectedAnswer) => handleAnswerChange(current.id, selectedAnswer)}
              matchingLayout={sitting ? 'grid' : 'list'}
              matchingRowFrom={runFrom}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="border-border border-t pt-6">
        <div className="flex items-center justify-between gap-4">
          <Button variant="ghost" onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0}>
            Назад
          </Button>

          <SaveIndicator status={saveStatus} />

          {isLast ? (
            <Button onClick={() => setConfirmOpen(true)} isLoading={complete.isPending}>
              Завершити тест
            </Button>
          ) : (
            <Button onClick={() => setIndex((i) => Math.min(total - 1, i + 1))}>Далі</Button>
          )}
        </div>

        {/* Available from anywhere, quietly: the reader who is done but standing
            on question three should not have to page to the end to hand in. */}
        {!isLast && (
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            disabled={complete.isPending}
            className="text-text-muted hover:text-text-primary mt-5 text-sm underline underline-offset-4 transition-colors disabled:opacity-60"
          >
            Завершити тест зараз
          </button>
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Завершити тест?"
        description={
          unanswered > 0
            ? `Без відповіді лишилось питань: ${unanswered}. Вони будуть зараховані як неправильні. Все одно завершити?`
            : 'Відповіді буде оцінено, і змінити їх уже не вийде.'
        }
        confirmLabel="Завершити тест"
        cancelLabel="Продовжити"
        isLoading={complete.isPending}
        onConfirm={handleComplete}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}

function SaveIndicator({ status }: { status: SaveStatus }): React.JSX.Element | null {
  if (status === 'idle') {
    return null;
  }
  if (status === 'saving') {
    return (
      <span className="text-text-muted flex items-center gap-2 text-xs">
        <Spinner className="size-3" /> Збереження…
      </span>
    );
  }
  if (status === 'saved') {
    return <span className="text-text-muted text-xs">Збережено</span>;
  }
  return <span className="text-error text-xs">Не збережено</span>;
}

function SessionSkeleton(): React.JSX.Element {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <Skeleton className="h-6 w-full" />
      <div className="flex flex-col gap-5">
        <Skeleton className="h-6 w-3/4" />
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-xl" />
          ))}
        </div>
      </div>
      <div className="flex justify-between">
        <Skeleton className="h-11 w-24" />
        <Skeleton className="h-11 w-28" />
      </div>
    </div>
  );
}
