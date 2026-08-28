import { motion } from 'framer-motion';
import { generatePath, useNavigate } from 'react-router-dom';
import type { UseQueryResult } from '@tanstack/react-query';
import { ROUTES } from '@/shared/constants/routes';
import { fadeInUp, staggerContainer, staggerDense } from '@/shared/constants/motion';
import { pluralUk } from '@/shared/utils/format';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Skeleton } from '@/shared/ui/Skeleton';
import type { PublicSubject, PublicTopic } from '@/features/subjects/types/subjects.types';
import { SectionError } from '@/features/subjects/components/SectionError';
import { useSubjectMaterials } from '@/features/learning-materials';

interface SubjectTopicsViewProps {
  subject: PublicSubject;
  topics: UseQueryResult<PublicTopic[]> | undefined;
  onBack: () => void;
  onStartQuiz: (subjectId: string, topicId?: string) => void;
}

/**
 * The topics of one subject, filling the page.
 *
 * This replaces the side panel the browser used before. On a phone that panel
 * rendered underneath the whole subject grid, so opening a subject appeared to
 * do nothing until the reader scrolled past every other subject. Here the
 * subject list is gone and its topics take its place, with a back control as
 * the only way out — the same shape as a native drill-down.
 */
export function SubjectTopicsView({
  subject,
  topics,
  onBack,
  onStartQuiz,
}: SubjectTopicsViewProps): React.JSX.Element {
  const navigate = useNavigate();
  const topicCount = topics?.data?.length ?? null;

  // One request per subject tells us which topics have a material, so each
  // card can decide whether to offer it without asking per topic. A failure
  // here simply leaves the buttons out — the topics themselves still work.
  const materials = useSubjectMaterials(subject.id);

  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="flex flex-col gap-8"
    >
      <motion.div variants={fadeInUp}>
        <button
          type="button"
          onClick={onBack}
          className="text-text-muted hover:text-text-primary focus-visible:ring-primary focus-visible:ring-offset-background -ml-2 inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
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
          Усі предмети
        </button>
      </motion.div>

      <motion.header variants={fadeInUp} className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <span
            aria-hidden="true"
            className="bg-surface-elevated flex size-14 shrink-0 items-center justify-center rounded-xl text-2xl font-semibold"
            style={{ color: subject.color ?? undefined }}
          >
            {subject.icon || subject.name.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <h1 className="text-text-primary text-2xl font-semibold sm:text-3xl">{subject.name}</h1>
            {topicCount !== null && (
              <p className="text-text-muted mt-0.5 text-sm">
                {topicCount} {pluralUk(topicCount, 'тема', 'теми', 'тем')}
              </p>
            )}
          </div>
        </div>

        {subject.description && <p className="text-text-secondary max-w-3xl">{subject.description}</p>}

        <div>
          <Button onClick={() => onStartQuiz(subject.id)}>Почати тест з предмета</Button>
        </div>
      </motion.header>

      <motion.section variants={fadeInUp} className="border-border flex flex-col gap-5 border-t pt-8">
        <h2 className="text-text-primary text-lg font-semibold">Теми</h2>

        {!topics || topics.isPending ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        ) : topics.isError ? (
          <Card>
            <SectionError message="Не вдалося завантажити теми." onRetry={() => void topics.refetch()} />
          </Card>
        ) : topics.data.length === 0 ? (
          <Card>
            <EmptyState
              title="Тем поки немає"
              description="У цьому предметі поки немає тем для тестування."
            />
          </Card>
        ) : (
          <motion.div
            variants={staggerDense}
            initial="initial"
            animate="animate"
            className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
          >
            {topics.data.map((topic) => {
              const material = materials.data?.get(topic.id);
              return (
                <motion.div
                  key={topic.id}
                  variants={fadeInUp}
                  className="border-border bg-surface flex flex-col gap-3 rounded-xl border p-5"
                >
                  <div className="flex-1">
                    <h3 className="text-text-primary font-medium">{topic.name}</h3>
                    {topic.description && (
                      <p className="text-text-muted mt-1 line-clamp-3 text-sm">{topic.description}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => onStartQuiz(subject.id, topic.id)}>
                      Почати тест
                    </Button>
                    {material && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => navigate(generatePath(ROUTES.topicMaterial, { topicId: topic.id }))}
                      >
                        Матеріал
                      </Button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </motion.section>
    </motion.div>
  );
}
