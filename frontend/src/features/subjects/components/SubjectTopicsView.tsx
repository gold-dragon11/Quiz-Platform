import { generatePath, useNavigate } from 'react-router-dom';
import type { UseQueryResult } from '@tanstack/react-query';
import { ROUTES } from '@/shared/constants/routes';
import { Button } from '@/shared/ui/Button';
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
 *
 * The topics themselves are rows, not cards. As cards each one carried the
 * same pair of filled buttons, so a screen of twenty topics was forty buttons
 * of equal weight and the reader had to read the labels to find out that half
 * of them did the same thing. On a row the two actions can differ in weight:
 * the test is the point of the screen, the conspectus is a link beside it.
 */
export function SubjectTopicsView({
  subject,
  topics,
  onBack,
  onStartQuiz,
}: SubjectTopicsViewProps): React.JSX.Element {
  const topicCount = topics?.data?.length ?? null;

  // One request per subject tells us which topics have a material, so each
  // row can decide whether to offer it without asking per topic. A failure
  // here simply leaves the link out — the topics themselves still work.
  const materials = useSubjectMaterials(subject.id);

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="text-text-muted hover:text-text-primary focus-visible:ring-primary focus-visible:ring-offset-background -ml-1 inline-flex items-center gap-2 rounded text-xs tracking-[0.18em] uppercase transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-4"
      >
        <span aria-hidden="true">←</span> Усі предмети
      </button>

      <header className="border-border mt-6 border-b pb-8">
        <h1 className="text-text-primary font-display text-4xl font-bold tracking-[-0.01em] sm:text-5xl">
          {subject.name}
        </h1>
        {subject.description && (
          <p className="text-text-secondary mt-4 max-w-2xl text-base text-pretty sm:text-lg">
            {subject.description}
          </p>
        )}
        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
          <Button onClick={() => onStartQuiz(subject.id)}>Тест з усього предмета</Button>
          {topicCount !== null && topicCount > 0 && (
            <p className="text-text-muted text-sm">або оберіть окрему тему — їх тут {topicCount}</p>
          )}
        </div>
      </header>

      <section className="mt-12">
        <h2 className="text-text-muted mb-5 text-xs tracking-[0.18em] uppercase">Теми</h2>

        {!topics || topics.isPending ? (
          <div className="border-border flex flex-col border-t">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="border-border border-b py-6">
                <Skeleton className="h-5 w-64" />
              </div>
            ))}
          </div>
        ) : topics.isError ? (
          <SectionError message="Не вдалося завантажити теми." onRetry={() => void topics.refetch()} />
        ) : topics.data.length === 0 ? (
          <p className="border-border text-text-secondary max-w-2xl border-l pl-5 text-sm">
            У цьому предметі поки немає тем. Тест з усього предмета вище все одно працює.
          </p>
        ) : (
          <ul className="divide-border border-border divide-y border-t">
            {topics.data.map((topic) => (
              <TopicRow
                key={topic.id}
                topic={topic}
                hasMaterial={materials.data?.has(topic.id) ?? false}
                onStartQuiz={() => onStartQuiz(subject.id, topic.id)}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function TopicRow({
  topic,
  hasMaterial,
  onStartQuiz,
}: {
  topic: PublicTopic;
  hasMaterial: boolean;
  onStartQuiz: () => void;
}): React.JSX.Element {
  const navigate = useNavigate();

  return (
    <li className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-3 py-6">
      <div className="min-w-0 flex-1">
        <h3 className="text-text-primary">{topic.name}</h3>
        {topic.description && <p className="text-text-muted mt-1 max-w-xl text-sm">{topic.description}</p>}
      </div>

      <div className="flex shrink-0 items-center gap-6">
        {hasMaterial && (
          <button
            type="button"
            onClick={() => navigate(generatePath(ROUTES.topicMaterial, { topicId: topic.id }))}
            className="text-text-secondary hover:text-text-primary text-sm underline underline-offset-4 transition-colors"
          >
            Конспект
          </button>
        )}
        <button
          type="button"
          onClick={onStartQuiz}
          className="text-primary text-sm underline underline-offset-4"
        >
          Пройти тест
        </button>
      </div>
    </li>
  );
}
