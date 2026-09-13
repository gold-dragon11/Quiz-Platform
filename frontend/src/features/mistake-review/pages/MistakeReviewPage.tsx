import { generatePath, useNavigate } from 'react-router-dom';
import { ROUTES } from '@/shared/constants/routes';
import { Alert } from '@/shared/ui/Alert';
import { Button } from '@/shared/ui/Button';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Skeleton } from '@/shared/ui/Skeleton';
import { formatNumber, pluralUk } from '@/shared/utils/format';
import { isApiError } from '@/shared/utils/apply-api-error';
import { ActiveQuizBanner } from '@/features/quiz/components/ActiveQuizBanner';
import { ReviewLadder } from '@/features/mistake-review/components/ReviewLadder';
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
 * One number dominates the screen and it is the only one that implies an
 * action: how much is due today. The rest of the state belongs in the ladder
 * below it, where it can be read as a trajectory instead of a scoreboard.
 *
 * Nothing to do today is a success state, not an empty one — the backend says
 * so in its own words on 409, and this page says so before the learner even
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
  // today included — so anything derived from it has to subtract them.
  const laterOn = Math.max((summary.data?.scheduled ?? 0) - due, 0);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        eyebrow="Інтервальне повторення"
        title="Повторення помилок"
        lead="Кожна помилка повертається за розкладом, і кожного разу пізніше. Відповіли правильно — інтервал росте; помилилися знову — усе спочатку."
      />

      <ActiveQuizBanner className="mt-8" />

      {errorMessage && (
        <Alert variant="error" className="mt-8">
          {errorMessage}
        </Alert>
      )}

      {summary.isPending ? (
        <Skeleton className="mt-12 h-40" />
      ) : summary.isError ? (
        <Alert variant="error" className="mt-8">
          Не вдалося завантажити стан повторення. Оновіть сторінку.
        </Alert>
      ) : (
        <>
          {/* The one number that implies an action, at the size that says so,
              with the action beside it rather than buried under a panel. */}
          <div className="border-border mt-12 flex flex-col gap-8 border-b pb-10 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-text-primary font-display text-7xl leading-none font-bold lining-nums sm:text-8xl">
                {formatNumber(due)}
              </p>
              <p className="text-text-muted mt-4 text-xs tracking-[0.18em] uppercase">
                {due === 1 ? 'питання на сьогодні' : 'питань на сьогодні'}
              </p>
            </div>

            <div className="max-w-sm sm:text-right">
              {due > 0 ? (
                <>
                  <p className="text-text-secondary mb-4 text-sm">
                    Коротка сесія — вона задумана як звичка, а не як марафон.
                  </p>
                  <Button onClick={handleStart} isLoading={startReview.isPending}>
                    Почати повторення
                  </Button>
                </>
              ) : (
                <p className="text-text-secondary text-sm">
                  {laterOn > 0
                    ? `Сьогодні вільно. Ще ${formatNumber(laterOn)} ${pluralUk(laterOn, 'помилка чекає', 'помилки чекають', 'помилок чекає')} свого дня — загляньте завтра.`
                    : 'Помилок на розкладі немає. Вони зʼявляться самі, щойно ви їх припуститеся.'}
                </p>
              )}
            </div>
          </div>

          <section className="mt-16">
            <h2 className="text-text-muted text-xs tracking-[0.18em] uppercase">Сходинки</h2>
            <p className="text-text-secondary mt-4 max-w-2xl text-sm">
              Де лежить вага — там ви і є. Купа на першій сходинці означає, що ті самі помилки повертаються;
              вага праворуч — що більшість уже майже позаду.
            </p>
            <div className="mt-8">
              <ReviewLadder rungs={summary.data.ladder} cleared={summary.data.cleared} />
            </div>
          </section>
        </>
      )}
    </div>
  );
}
