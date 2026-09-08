import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ROUTES } from '@/shared/constants/routes';
import { Input } from '@/shared/ui/Input';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Skeleton } from '@/shared/ui/Skeleton';
import { pluralUk } from '@/shared/utils/format';
import { useAllSubjectTopics, useSubjects } from '@/features/subjects/hooks/use-subjects';
import { SubjectEntry } from '@/features/subjects/components/SubjectEntry';
import { SubjectTopicsView } from '@/features/subjects/components/SubjectTopicsView';
import { SectionError } from '@/features/subjects/components/SectionError';
import type { PublicTopic } from '@/features/subjects/types/subjects.types';

/** Query parameter holding the opened subject's slug. */
const SUBJECT_PARAM = 'subject';

/**
 * `/subjects` (RequireAuth). The learning hub, as a two-step drill-down:
 * browse every subject, open one to see its topics, and start a quiz —
 * subject-wide or per topic — through the existing Quiz Start flow, prefilled
 * via query params.
 *
 * The list is a table of contents, not a grid of cards. A card per subject
 * gave four equal boxes whose only content was a name, a coloured initial and
 * «18 тем» — the reader could not tell from it whether what they needed was
 * covered. Printing the topic names is the whole answer, and it costs no extra
 * request: the browser already loads every subject's topics to power search.
 *
 * Search filters subjects, and inside a matched subject it narrows the printed
 * topics to the ones that matched, so a hit on «Вектори» shows *why* Математика
 * is still on screen instead of leaving the reader to guess.
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

  /**
   * Each surviving subject carries the topics worth printing for it: all of
   * them normally, and only the matching ones when the subject itself did not
   * match the query by name.
   */
  const entries = useMemo(() => {
    return subjectList
      .map((subject) => {
        const topics: PublicTopic[] = topicsById.get(subject.id)?.data ?? [];
        const topicsPending = topicsById.get(subject.id)?.isPending ?? false;

        if (!normalizedQuery) {
          return { subject, topics, shownTopics: topics, topicsPending, matched: true };
        }

        const nameMatches = subject.name.toLowerCase().includes(normalizedQuery);
        const matchingTopics = topics.filter((topic) => topic.name.toLowerCase().includes(normalizedQuery));

        return {
          subject,
          topics,
          shownTopics: nameMatches ? topics : matchingTopics,
          topicsPending,
          matched: nameMatches || matchingTopics.length > 0,
        };
      })
      .filter((entry) => entry.matched);
  }, [subjectList, normalizedQuery, topicsById]);

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

  const openedSubject = openedSlug
    ? (subjectList.find((subject) => subject.slug === openedSlug) ?? null)
    : null;

  // A slug that matches nothing — an edited URL, or a subject unpublished
  // since the link was made — falls back to the list rather than an error.
  if (openedSubject) {
    return (
      <div className="mx-auto w-full max-w-4xl">
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
    <div className="mx-auto w-full max-w-4xl">
      <PageHeader
        eyebrow="Каталог"
        title="Предмети"
        lead="Усе, що можна вчити. Оберіть предмет, щоб відкрити його теми, конспекти й тести."
      />

      <div className="mt-10 max-w-md">
        <Input
          type="search"
          aria-label="Пошук предметів і тем"
          placeholder="Пошук за назвою предмета або теми…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      <div className="mt-10">
        {subjects.isPending ? (
          <ListSkeleton />
        ) : subjects.isError ? (
          <SectionError onRetry={() => void subjects.refetch()} />
        ) : subjectList.length === 0 ? (
          <p className="border-border text-text-secondary max-w-2xl border-l pl-5 text-sm">
            Опублікованих предметів поки немає. Зазирніть трохи згодом.
          </p>
        ) : entries.length === 0 ? (
          <p className="border-border text-text-secondary max-w-2xl border-l pl-5 text-sm">
            За запитом «{query.trim()}» не знайшлося ні предмета, ні теми.{' '}
            <button
              type="button"
              onClick={() => setQuery('')}
              className="text-primary underline underline-offset-4"
            >
              Показати всі
            </button>
          </p>
        ) : (
          <>
            <ul className="border-border border-t">
              {entries.map((entry) => (
                <SubjectEntry
                  key={entry.subject.id}
                  subject={entry.subject}
                  topics={entry.shownTopics}
                  topicCount={entry.topics.length}
                  topicsPending={entry.topicsPending}
                  filtered={normalizedQuery.length > 0 && entry.shownTopics.length < entry.topics.length}
                  onOpen={() => openSubject(entry.subject.slug)}
                />
              ))}
            </ul>

            {normalizedQuery && (
              <p className="text-text-muted mt-6 text-sm">
                Знайдено {entries.length} {pluralUk(entries.length, 'предмет', 'предмети', 'предметів')}.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ListSkeleton(): React.JSX.Element {
  return (
    <div className="border-border flex flex-col border-t">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="border-border flex flex-col gap-3 border-b py-8">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-full max-w-2xl" />
        </div>
      ))}
    </div>
  );
}
