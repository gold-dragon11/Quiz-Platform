import { useNavigate, useParams } from 'react-router-dom';
import { ROUTES } from '@/shared/constants/routes';
import { Button } from '@/shared/ui/Button';
import { Skeleton } from '@/shared/ui/Skeleton';
import { isApiError } from '@/shared/utils/apply-api-error';
import { useIsLearner } from '@/shared/hooks/use-is-learner';
import { MaterialBody } from '@/features/learning-materials/components/MaterialBody';
import { useTopicMaterial } from '@/features/learning-materials/hooks/use-learning-materials';

/**
 * `/topics/:topicId/material` (RequireAuth). One learning material, read start
 * to finish (docs/04-api/learning-materials.md §4).
 *
 * A topic with no material answers 404, which is an ordinary outcome here —
 * most topics have none yet — so it shows a plain sentence, not an error.
 *
 * Three things this screen used to get wrong:
 *
 * - it opened with a 24px sans heading while every other screen opens in the
 *   display serif, so the one page in the product that is *only* text was the
 *   one that looked least like reading matter;
 * - «До предметів» appeared twice, once above the article and once below it,
 *   which on a short material put the same link twice on one screen;
 * - `estimatedReadingTime` is computed by the backend and was shown nowhere.
 *   On a long page that is the number a reader actually wants before starting.
 *
 * The quiz action is offered only to accounts that can sit one. A teacher can
 * reach this page (materials are shared) but not `/quiz`, so the button would
 * have sent them to a 403.
 */
export function MaterialPage(): React.JSX.Element {
  const { topicId = '' } = useParams();
  const navigate = useNavigate();
  const material = useTopicMaterial(topicId);
  const isLearner = useIsLearner();

  if (material.isPending) {
    return <MaterialSkeleton />;
  }

  if (material.isError) {
    const notFound = isApiError(material.error) ? material.error.status === 404 : false;
    return (
      <div className="mx-auto max-w-3xl">
        <p className="border-border text-text-secondary max-w-xl border-l pl-5 text-sm">
          {notFound
            ? 'Для цієї теми конспект ще не написано — тест із неї все одно можна пройти.'
            : 'Не вдалося завантажити конспект. Спробуйте оновити сторінку за кілька секунд.'}{' '}
          <button
            type="button"
            onClick={() => navigate(ROUTES.subjects)}
            className="text-primary underline underline-offset-4"
          >
            До предметів
          </button>
        </p>
      </div>
    );
  }

  const { title, description, content, subjectId, estimatedReadingTime } = material.data;

  const startQuiz = (): void => {
    const params = new URLSearchParams({ subjectId });
    if (material.data.topicId) {
      params.set('topicId', material.data.topicId);
    }
    navigate({ pathname: ROUTES.quiz, search: `?${params.toString()}` });
  };

  return (
    <article className="mx-auto w-full max-w-3xl">
      <header className="border-border border-b pb-8">
        <p className="text-text-muted text-xs tracking-[0.18em] uppercase">
          Конспект
          {estimatedReadingTime !== null && ` · ${estimatedReadingTime} хв читання`}
        </p>
        <h1 className="text-text-primary font-display mt-3 text-4xl font-bold tracking-[-0.01em] sm:text-5xl">
          {title}
        </h1>
        {description && (
          <p className="text-text-secondary mt-4 max-w-2xl text-base text-pretty sm:text-lg">{description}</p>
        )}
      </header>

      <div className="mt-10">
        <MaterialBody content={content} />
      </div>

      <div className="border-border mt-16 flex flex-wrap items-center gap-x-8 gap-y-4 border-t pt-8">
        {isLearner && <Button onClick={startQuiz}>Пройти тест із цієї теми</Button>}
        <button
          type="button"
          onClick={() => navigate(ROUTES.subjects)}
          className="text-text-secondary hover:text-text-primary text-sm underline underline-offset-4 transition-colors"
        >
          До предметів
        </button>
      </div>
    </article>
  );
}

function MaterialSkeleton(): React.JSX.Element {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-12 w-2/3" />
      <div className="flex flex-col gap-3 pt-8">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className={i % 4 === 3 ? 'h-4 w-3/5' : 'h-4 w-full'} />
        ))}
      </div>
    </div>
  );
}
