import { generatePath, useNavigate } from 'react-router-dom';
import { ROUTES } from '@/shared/constants/routes';
import { Alert } from '@/shared/ui/Alert';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { EmptyState } from '@/shared/ui/EmptyState';
import { SectionHeader } from '@/shared/ui/SectionHeader';
import { Skeleton } from '@/shared/ui/Skeleton';
import { StatCard } from '@/shared/ui/StatCard';
import { formatNumber, pluralUk } from '@/shared/utils/format';
import { isApiError } from '@/shared/utils/apply-api-error';
import { ActiveQuizBanner } from '@/features/quiz/components/ActiveQuizBanner';
import {
  useMistakeReviewSummary,
  useStartMistakeReview,
} from '@/features/mistake-review/hooks/use-mistake-review';

/**
 * `/mistake-review` (RequireAuth) — the mistakes due today, at widening
 * intervals.
 *
 * Distinct from practice "за помилками", which offers every unresolved mistake
 * at once. This one respects the schedule, so a learner who opens it daily
 * meets each question at growing gaps instead of grinding the same list.
 *
 * Nothing to do today is a success state, not an empty one. The backend says
 * so in its own words on 409, and the page says so before the learner even
 * presses the button.
 */
export function MistakeReviewPage(): React.JSX.Element {
  const navigate = useNavigate();
  const summary = useMistakeReviewSummary();
  const startReview = useStartMistakeReview();

  const startError = startReview.error;
  const errorMessage = isApiError(startError)
    ? startError.message
    : startError
      ? 'Не вдалося почати повторення. Спробуйте ще раз.'
      : null;

  function handleStart(): void {
    startReview.mutate(
      {},
      {
        onSuccess: (session) => {
          navigate(generatePath(ROUTES.quizSession, { sessionId: session.sessionId }));
        },
      },
    );
  }

  const due = summary.data?.due ?? 0;
  // `scheduled` from the API counts every uncleared mistake — the ones due
  // today included. Showing it raw beside `due` would put 12 next to 36 with
  // the 12 inside the 36, so the tiles split it into three groups that do not
  // overlap and add up.
  const laterOn = Math.max((summary.data?.scheduled ?? 0) - due, 0);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <SectionHeader
        title="Повторення помилок"
        description="Кожна помилка повертається за розкладом — спершу за день, потім за три, за тиждень. Доки не перестане бути помилкою."
      />

      <ActiveQuizBanner />

      {summary.isPending ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : summary.isError ? (
        <Alert variant="error">Не вдалося завантажити стан повторення. Оновіть сторінку.</Alert>
      ) : (
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard label="Сьогодні" value={formatNumber(summary.data.due)} hint="Чекають на повторення" />
          <StatCard label="Далі за розкладом" value={formatNumber(laterOn)} hint="Повернуться пізніше" />
          <StatCard
            label="Виправлено"
            value={formatNumber(summary.data.cleared)}
            hint="Зійшли з розкладу назавжди"
          />
        </div>
      )}

      <Card className="flex flex-col gap-5">
        {errorMessage && <Alert variant="error">{errorMessage}</Alert>}

        {!summary.isPending && !summary.isError && due === 0 ? (
          <EmptyState
            title="На сьогодні повторювати нічого"
            description={
              laterOn > 0
                ? `Ще ${formatNumber(laterOn)} ${pluralUk(laterOn, 'помилка чекає', 'помилки чекають', 'помилок чекає')} свого дня. Загляньте завтра.`
                : 'Помилок на розкладі немає. Вони зʼявляться самі, щойно ви їх припуститеся.'
            }
          />
        ) : (
          <>
            <p className="text-text-secondary text-sm">
              {due > 0
                ? `Сьогодні до повторення ${formatNumber(due)} ${pluralUk(due, 'питання', 'питання', 'питань')}. Це коротка сесія — вона задумана як звичка, а не як марафон.`
                : 'Коротка сесія з тих помилок, що підійшли за розкладом.'}
            </p>
            <Button onClick={handleStart} isLoading={startReview.isPending} fullWidth>
              Почати повторення
            </Button>
          </>
        )}
      </Card>
    </div>
  );
}
