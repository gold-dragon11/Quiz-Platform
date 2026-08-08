import { motion } from 'framer-motion';
import { generatePath, useNavigate, useParams } from 'react-router-dom';
import { ROUTES } from '@/shared/constants/routes';
import { fadeInUp, staggerContainer } from '@/shared/constants/motion';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Skeleton } from '@/shared/ui/Skeleton';
import { isApiError } from '@/shared/utils/apply-api-error';
import { useQuizResult } from '@/features/quiz/hooks/use-quiz';
import { ResultSummary } from '@/features/quiz/components/ResultSummary';
import { ResultReview } from '@/features/quiz/components/ResultReview';

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
    const status = isApiError(result.error) ? result.error.status : 0;
    const notCompleted = status === 409;
    return (
      <div className="mx-auto max-w-2xl">
        <Card>
          <EmptyState
            title="Результат недоступний"
            description={
              notCompleted
                ? 'Цей тест ще не завершено, тож результату немає.'
                : 'Не вдалося знайти результат цього тесту.'
            }
            action={
              notCompleted ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate(generatePath(ROUTES.quizSession, { sessionId }))}
                >
                  Продовжити тест
                </Button>
              ) : (
                <Button variant="secondary" size="sm" onClick={() => navigate(ROUTES.quiz)}>
                  До тестів
                </Button>
              )
            }
          />
        </Card>
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
        <ResultSummary result={result.data.result} />
      </motion.div>

      <motion.div variants={fadeInUp} className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button onClick={() => navigate(ROUTES.quiz)}>Спробувати ще раз</Button>
        <Button variant="secondary" onClick={() => navigate(ROUTES.dashboard)}>
          На головну
        </Button>
        <Button variant="ghost" onClick={() => navigate(ROUTES.statistics)}>
          Статистика
        </Button>
      </motion.div>

      <motion.div variants={fadeInUp}>
        <ResultReview questions={result.data.questions} />
      </motion.div>
    </motion.div>
  );
}

function ResultSkeleton(): React.JSX.Element {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <Skeleton className="h-48 w-full rounded-xl" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-40 w-full rounded-xl" />
    </div>
  );
}
