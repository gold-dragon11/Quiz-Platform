import { motion } from 'framer-motion';
import { generatePath, useNavigate, useParams } from 'react-router-dom';
import { ROUTES } from '@/shared/constants/routes';
import { fadeInUp, staggerContainer } from '@/shared/constants/motion';
import { Button } from '@/shared/ui/Button';
import { Skeleton } from '@/shared/ui/Skeleton';
import { isApiError } from '@/shared/utils/apply-api-error';
import { useQuizResult } from '@/features/quiz/hooks/use-quiz';
import { ResultSummary } from '@/features/quiz/components/ResultSummary';
import { ResultReview } from '@/features/quiz/components/ResultReview';
import { NmtResult } from '@/features/quiz/components/NmtResult';
import { MaterialLink } from '@/features/quiz/components/MaterialLink';

/**
 * `/quiz/:sessionId/result` (RequireAuth). The post-completion result and
 * review (docs/04-api/quiz.md §8). A not-yet-completed session (409) or an
 * unknown one (404) shows a "result unavailable" state instead of an error.
 */
export function QuizResultPage(): React.JSX.Element {
  const { sessionId = '' } = useParams();
  const navigate = useNavigate();
  const result = useQuizResult(sessionId);

  if (result.isPending) {
    return <ResultSkeleton />;
  }

  if (result.isError) {
    const notCompleted = isApiError(result.error) && result.error.status === 409;
    return (
      <div className="mx-auto max-w-2xl">
        <p className="border-border text-text-secondary max-w-xl border-l pl-5 text-sm">
          {notCompleted ? (
            <>
              Цей тест ще не завершено, тож результату поки немає.{' '}
              <button
                type="button"
                onClick={() => navigate(generatePath(ROUTES.quizSession, { sessionId }))}
                className="text-primary underline underline-offset-4"
              >
                Повернутися до нього
              </button>
            </>
          ) : (
            <>
              Не вдалося знайти результат цього тесту.{' '}
              <button
                type="button"
                onClick={() => navigate(ROUTES.quiz)}
                className="text-primary underline underline-offset-4"
              >
                Почати новий
              </button>
            </>
          )}
        </p>
      </div>
    );
  }

  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="mx-auto flex max-w-2xl flex-col gap-8"
    >
      <motion.div variants={fadeInUp}>
        {/* A mock sitting of an NMT paper is reported the exam's way; the
            percentage below is for practice, where there is no scale. */}
        {result.data.nmt ? (
          <NmtResult nmt={result.data.nmt} xpEarned={result.data.result.xpEarned} />
        ) : (
          <ResultSummary result={result.data.result} />
        )}
      </motion.div>

      {result.data.session.topicId && (
        <motion.div variants={fadeInUp}>
          <MaterialLink topicId={result.data.session.topicId} />
        </motion.div>
      )}

      <motion.div variants={fadeInUp}>
        <ResultReview
          questions={result.data.questions}
          numbers={
            result.data.nmt
              ? new Map(result.data.nmt.tasks.map((task) => [task.questionId, task.number]))
              : undefined
          }
        />
      </motion.div>

      {/* One action, at the end, where somebody who has actually read the
          review arrives. Three equal buttons above the review asked the reader
          to choose before they had seen anything — and the first of them said
          "спробувати ще раз" while opening the form for a different test. */}
      <motion.div variants={fadeInUp} className="border-border flex flex-wrap gap-6 border-t pt-6">
        <Button onClick={() => navigate(ROUTES.quiz)}>Пройти ще один тест</Button>
        <button
          type="button"
          onClick={() => navigate(ROUTES.dashboard)}
          className="text-text-secondary hover:text-text-primary text-sm underline underline-offset-4 transition-colors"
        >
          На головну
        </button>
      </motion.div>
    </motion.div>
  );
}

function ResultSkeleton(): React.JSX.Element {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
