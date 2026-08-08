import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/shared/constants/routes';
import { fadeInUp, staggerContainer } from '@/shared/constants/motion';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Input } from '@/shared/ui/Input';
import { Skeleton } from '@/shared/ui/Skeleton';
import { useAllSubjectTopics, useSubjects } from '@/features/subjects/hooks/use-subjects';
import { SubjectsHero } from '@/features/subjects/components/SubjectsHero';
import { SubjectCard } from '@/features/subjects/components/SubjectCard';
import { SubjectDetailsPanel } from '@/features/subjects/components/SubjectDetailsPanel';
import { SectionError } from '@/features/subjects/components/SectionError';

/**
 * `/subjects` (RequireAuth). The learning hub: browse subjects, open one to see
 * its topics, and start a quiz (subject-wide or per topic) — always through the
 * existing Quiz Start flow, prefilled via query params. Search is client-side
 * over subject and topic names. Sections are isolated (own loading/empty/error).
 */
export function SubjectsBrowserPage(): React.JSX.Element {
  const navigate = useNavigate();
  const subjects = useSubjects();
  const [selectedId, setSelectedId] = useState<string | null>(null);
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

  const selectedSubject = subjectList.find((subject) => subject.id === selectedId) ?? null;

  const startQuiz = (subjectId: string, topicId?: string): void => {
    const params = new URLSearchParams({ subjectId });
    if (topicId) {
      params.set('topicId', topicId);
    }
    navigate({ pathname: ROUTES.quiz, search: `?${params.toString()}` });
  };

  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="mx-auto flex max-w-6xl flex-col gap-8"
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
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              {filtered.length === 0 ? (
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
                  variants={staggerContainer}
                  initial="initial"
                  animate="animate"
                  className="grid gap-4 sm:grid-cols-2"
                >
                  {filtered.map((subject) => {
                    const topics = topicsById.get(subject.id);
                    return (
                      <motion.div key={subject.id} variants={fadeInUp}>
                        <SubjectCard
                          subject={subject}
                          topicCount={topics?.data?.length ?? null}
                          topicsLoading={topics?.isPending ?? false}
                          selected={subject.id === selectedId}
                          onSelect={() => setSelectedId(subject.id)}
                        />
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}
            </div>

            <div className={selectedSubject ? 'lg:col-span-1' : 'hidden lg:col-span-1 lg:block'}>
              <SubjectDetailsPanel
                subject={selectedSubject}
                topics={selectedId ? topicsById.get(selectedId) : undefined}
                onStartQuiz={startQuiz}
              />
            </div>
          </div>
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
