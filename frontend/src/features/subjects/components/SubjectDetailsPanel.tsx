import type { UseQueryResult } from '@tanstack/react-query';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Skeleton } from '@/shared/ui/Skeleton';
import type { PublicSubject, PublicTopic } from '@/features/subjects/types/subjects.types';
import { SectionError } from '@/features/subjects/components/SectionError';

interface SubjectDetailsPanelProps {
  subject: PublicSubject | null;
  topics: UseQueryResult<PublicTopic[]> | undefined;
  onStartQuiz: (subjectId: string, topicId?: string) => void;
}

/**
 * Details panel for the selected subject (Phase 6.7 §3-4): a subject-wide
 * "Start a quiz" plus every topic with a per-topic Start Quiz. Topics come from
 * the cached per-subject query (§9 caching). Estimated question count and
 * difficulty are not exposed by the content API, so they are omitted. On
 * desktop this is a sticky side panel; on mobile the page renders it below the
 * grid.
 */
export function SubjectDetailsPanel({
  subject,
  topics,
  onStartQuiz,
}: SubjectDetailsPanelProps): React.JSX.Element {
  if (!subject) {
    return (
      <Card className="text-text-muted text-center text-sm lg:sticky lg:top-6">
        Select a subject to see its topics.
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-4 lg:sticky lg:top-6">
      <div>
        <h2 className="text-text-primary text-lg font-semibold">{subject.name}</h2>
        {subject.description && <p className="text-text-muted mt-1 text-sm">{subject.description}</p>}
      </div>

      <Button variant="secondary" onClick={() => onStartQuiz(subject.id)}>
        Start a subject quiz
      </Button>

      <div className="border-border flex flex-col gap-3 border-t pt-4">
        <h3 className="text-text-muted text-xs font-medium tracking-wide uppercase">Topics</h3>

        {!topics || topics.isPending ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-lg" />
            ))}
          </div>
        ) : topics.isError ? (
          <SectionError message="We couldn't load the topics." onRetry={() => void topics.refetch()} />
        ) : topics.data.length === 0 ? (
          <EmptyState
            title="No topics yet"
            description="This subject doesn't have any topics to quiz on yet."
          />
        ) : (
          <div className="flex flex-col gap-3">
            {topics.data.map((topic) => (
              <div key={topic.id} className="border-border flex flex-col gap-3 rounded-lg border p-4">
                <div>
                  <p className="text-text-primary font-medium">{topic.name}</p>
                  {topic.description && <p className="text-text-muted mt-0.5 text-sm">{topic.description}</p>}
                </div>
                <div>
                  <Button size="sm" onClick={() => onStartQuiz(subject.id, topic.id)}>
                    Start quiz
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
