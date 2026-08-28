import { motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { fadeInUp, staggerContainer } from '@/shared/constants/motion';
import { ROUTES } from '@/shared/constants/routes';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Skeleton } from '@/shared/ui/Skeleton';
import { isApiError } from '@/shared/utils/apply-api-error';
import { MaterialBody } from '@/features/learning-materials/components/MaterialBody';
import { useTopicMaterial } from '@/features/learning-materials/hooks/use-learning-materials';

/**
 * `/topics/:topicId/material` (RequireAuth). One learning material, read
 * start to finish (docs/04-api/learning-materials.md §4).
 *
 * A topic with no material answers 404, which is an ordinary outcome here —
 * most topics have none yet — so it shows an empty state, not an error.
 */
export function MaterialPage(): React.JSX.Element {
  const { topicId = '' } = useParams();
  const navigate = useNavigate();
  const material = useTopicMaterial(topicId);

  if (material.isPending) {
    return <MaterialSkeleton />;
  }

  if (material.isError) {
    const notFound = isApiError(material.error) ? material.error.status === 404 : false;
    return (
      <div className="mx-auto max-w-2xl">
        <Card>
          <EmptyState
            title={notFound ? 'Матеріалу поки немає' : 'Не вдалося завантажити матеріал'}
            description={
              notFound
                ? 'Для цієї теми конспект ще не написано. Ви все одно можете пройти тест.'
                : 'Спробуйте оновити сторінку за кілька секунд.'
            }
            action={
              <Button variant="secondary" size="sm" onClick={() => navigate(ROUTES.subjects)}>
                До предметів
              </Button>
            }
          />
        </Card>
      </div>
    );
  }

  const { title, description, content, subjectId } = material.data;

  const startQuiz = (): void => {
    const params = new URLSearchParams({ subjectId });
    if (material.data.topicId) {
      params.set('topicId', material.data.topicId);
    }
    navigate({ pathname: ROUTES.quiz, search: `?${params.toString()}` });
  };

  return (
    <motion.article
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="mx-auto flex w-full max-w-3xl flex-col gap-8"
    >
      <motion.header variants={fadeInUp} className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => navigate(ROUTES.subjects)}
          className="text-text-muted hover:text-text-primary focus-visible:ring-primary focus-visible:ring-offset-background -ml-2 inline-flex w-fit items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        >
          <svg
            width={18}
            height={18}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M19 12H5" />
            <path d="m12 19-7-7 7-7" />
          </svg>
          До предметів
        </button>

        <h1 className="text-text-primary text-2xl font-semibold sm:text-3xl">{title}</h1>
        {description && <p className="text-text-secondary">{description}</p>}
      </motion.header>

      <motion.div variants={fadeInUp} className="border-border border-t pt-8">
        <MaterialBody content={content} />
      </motion.div>

      <motion.div variants={fadeInUp} className="border-border flex flex-col gap-3 border-t pt-8 sm:flex-row">
        <Button onClick={startQuiz}>Пройти тест із цієї теми</Button>
        <Button variant="secondary" onClick={() => navigate(ROUTES.subjects)}>
          До предметів
        </Button>
      </motion.div>
    </motion.article>
  );
}

function MaterialSkeleton(): React.JSX.Element {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <Skeleton className="h-8 w-2/3 rounded-lg" />
      <Skeleton className="h-4 w-1/2" />
      <div className="flex flex-col gap-3 pt-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className={i % 4 === 3 ? 'h-4 w-3/5' : 'h-4 w-full'} />
        ))}
      </div>
    </div>
  );
}
