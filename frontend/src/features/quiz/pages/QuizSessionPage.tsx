import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { generatePath, useNavigate, useParams } from 'react-router-dom';
import { ROUTES } from '@/shared/constants/routes';
import { slideSwap, TRANSITION } from '@/shared/constants/motion';
import { toast } from '@/stores/toast-store';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Skeleton } from '@/shared/ui/Skeleton';
import { Spinner } from '@/shared/ui/Spinner';
import { isApiError } from '@/shared/utils/apply-api-error';
import { QuizStatus } from '@/shared/types/enums';
import { useQuizSession, useSubmitAnswer, useCompleteQuiz } from '@/features/quiz/hooks/use-quiz';
import type { SelectedAnswer } from '@/features/quiz/types/quiz.types';
import { QuestionCard } from '@/features/quiz/components/QuestionCard';
import { QuizProgress } from '@/features/quiz/components/QuizProgress';
import { QuizTimer } from '@/features/quiz/components/QuizTimer';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

/**
 * `/quiz/:sessionId` (RequireAuth). The full quiz runtime (docs/04-api/quiz.md
 * §5-7, §9): loads the resume state, renders the current question, autosaves
 * every answer to the backend (never only locally), supports back/next
 * navigation, shows the timer when enabled, and completes the quiz. Reconnects
 * reload via the resume query; an already-completed session redirects to the
 * result.
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
        <Card>
          {notFound ? (
            <EmptyState
              title="Тест недоступний"
              description="Такої сесії тесту не існує або вона більше недоступна."
              action={
                <Button variant="secondary" size="sm" onClick={() => navigate(ROUTES.quiz)}>
                  До тестів
                </Button>
              }
            />
          ) : (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <p className="text-text-muted text-sm">Не вдалося завантажити цю сесію тесту.</p>
              <Button variant="secondary" size="sm" onClick={() => void session.refetch()}>
                Спробувати ще раз
              </Button>
            </div>
          )}
        </Card>
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
        <Card>
          <EmptyState
            title="Питань немає"
            description="У цьому тесті немає питань для показу."
            action={
              <Button variant="secondary" size="sm" onClick={() => navigate(ROUTES.quiz)}>
                До тестів
              </Button>
            }
          />
        </Card>
      </div>
    );
  }

  const total = questions.length;
  const current = questions[index];
  const answeredCount = questions.filter((q) => answers[q.id] !== undefined).length;
  const isLast = index === total - 1;
  const unanswered = total - answeredCount;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <QuizProgress index={index} total={total} answeredCount={answeredCount} />
        </div>
        {meta.timerEnabled && meta.expiresAt && (
          <QuizTimer expiresAt={meta.expiresAt} onExpire={handleComplete} />
        )}
      </div>

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
          />
        </motion.div>
      </AnimatePresence>

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
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <Skeleton className="h-6 w-full" />
      <Card className="flex flex-col gap-5">
        <Skeleton className="h-6 w-3/4" />
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-xl" />
          ))}
        </div>
      </Card>
      <div className="flex justify-between">
        <Skeleton className="h-11 w-24" />
        <Skeleton className="h-11 w-28" />
      </div>
    </div>
  );
}
