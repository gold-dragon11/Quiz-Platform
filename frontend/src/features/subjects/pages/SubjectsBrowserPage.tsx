import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ROUTES } from '@/shared/constants/routes';
import { fadeInUp, staggerContainer, staggerDense } from '@/shared/constants/motion';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Input } from '@/shared/ui/Input';
import { Skeleton } from '@/shared/ui/Skeleton';
import { useAllSubjectTopics, useSubjects } from '@/features/subjects/hooks/use-subjects';
import { SubjectsHero } from '@/features/subjects/components/SubjectsHero';
import { SubjectCard } from '@/features/subjects/components/SubjectCard';
import { SubjectTopicsView } from '@/features/subjects/components/SubjectTopicsView';
import { SectionError } from '@/features/subjects/components/SectionError';

/** Query parameter holding the opened subject's slug. */
const SUBJECT_PARAM = 'subject';

/**
 * `/subjects` (RequireAuth). The learning hub, as a two-step drill-down:
 * browse every subject, open one to see its topics, and start a quiz —
 * subject-wide or per topic — through the existing Quiz Start flow, prefilled
 * via query params. Search is client-side over subject and topic names.
 *
 * The opened subject lives in the URL (`?subject=<slug>`) rather than in
 * component state, so the browser's own back control and a phone's back
 * gesture return to the list instead of leaving the page, and a reload keeps
 * the reader where they were. The slug is used rather than the id because it
 * is stable, readable, and already unique.
 */
export function SubjectsBrowserPage(): React.JSX.Element {
  const navigate = useNavigate();
  const subjects = useSubjects();
  const [searchParams, setSearchParams] = useSearchParams();
  const openedSlug = searchParams.get(SUBJECT_PARAM);
  // Local rather than in the URL: the page stays mounted while a subject is
  // open, so the query survives the round trip on its own, and keeping it out
  // of the address bar leaves the shared link clean.
  const [query, setQuery] = useState('');

  const subjectList = useMemo(() => subjects.data ?? [], [subjects.data]);
  const subjectIds = useMemo(() => subjectList.map((subject) => subject.id), [subjectList]);
  const topicQueries = useAllSubjectTopics(subjectIds);

  const topicsById = useMemo(() => {
    const map = new Map<string, (typeof topicQueries)[number]>();
    subjectIds.forEach((id, i) => map.set(id, topicQueries[i]));
    return map;
  }, [subjectIds, topicQueries]);

  const normalizedQuery = query.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      subjectList.filter((subject) => {
        if (!normalizedQuery) {
          return true;
        }
        if (subject.name.toLowerCase().includes(normalizedQuery)) {
          return true;
        }
        const topics = topicsById.get(subject.id)?.data ?? [];
        return topics.some((topic) => topic.name.toLowerCase().includes(normalizedQuery));
      }),
    [subjectList, normalizedQuery, topicsById],
  );

  const openedSubject = openedSlug
    ? (subjectList.find((subject) => subject.slug === openedSlug) ?? null)
    : null;

  const openSubject = (slug: string): void => {
    setSearchParams((params) => {
      params.set(SUBJECT_PARAM, slug);
      return params;
    });
  };

  const closeSubject = (): void => {
    setSearchParams((params) => {
      params.delete(SUBJECT_PARAM);
      return params;
    });
  };

  const startQuiz = (subjectId: string, topicId?: string): void => {
    const params = new URLSearchParams({ subjectId });
    if (topicId) {
      params.set('topicId', topicId);
    }
    navigate({ pathname: ROUTES.quiz, search: `?${params.toString()}` });
  };

  // A slug that matches nothing — an edited URL, or a subject unpublished
  // since the link was made — falls back to the list rather than an error.
  if (openedSubject) {
    return (
      <div className="mx-auto w-full max-w-6xl">
        <SubjectTopicsView
          subject={openedSubject}
          topics={topicsById.get(openedSubject.id)}
          onBack={closeSubject}
          onStartQuiz={startQuiz}
        />
      </div>
    );
  }

  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="mx-auto flex w-full max-w-6xl flex-col gap-8"
    >
      <motion.div variants={fadeInUp}>
        <SubjectsHero />
      </motion.div>

      <motion.div variants={fadeInUp}>
        <Input
          type="search"
          aria-label="Пошук предметів і тем"
          placeholder="Пошук предметів і тем…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </motion.div>

      <motion.div variants={fadeInUp}>
        {subjects.isPending ? (
          <SubjectsGridSkeleton />
        ) : subjects.isError ? (
          <Card>
            <SectionError onRetry={() => void subjects.refetch()} />
          </Card>
        ) : subjectList.length === 0 ? (
          <Card>
            <EmptyState
              title="Предметів поки немає"
              description="Опублікованих предметів поки немає. Зазирніть трохи згодом."
            />
          </Card>
        ) : filtered.length === 0 ? (
          <Card>
            <EmptyState
              title="Нічого не знайдено"
              description={`За запитом «${query.trim()}» нічого не знайдено. Спробуйте інший.`}
              action={
                <Button variant="secondary" size="sm" onClick={() => setQuery('')}>
                  Очистити пошук
                </Button>
              }
            />
          </Card>
        ) : (
          <motion.div
            variants={staggerDense}
            initial="initial"
            animate="animate"
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {filtered.map((subject) => {
              const topics = topicsById.get(subject.id);
              return (
                <motion.div key={subject.id} variants={fadeInUp}>
                  <SubjectCard
                    subject={subject}
                    topicCount={topics?.data?.length ?? null}
                    topicsLoading={topics?.isPending ?? false}
                    onSelect={() => openSubject(subject.slug)}
                  />
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}

function SubjectsGridSkeleton(): React.JSX.Element {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-36 rounded-xl" />
      ))}
    </div>
  );
}
