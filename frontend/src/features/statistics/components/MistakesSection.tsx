import { useState } from 'react';
import { generatePath, useNavigate } from 'react-router-dom';
import { ROUTES } from '@/shared/constants/routes';
import { toast } from '@/stores/toast-store';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { EmptyState } from '@/shared/ui/EmptyState';
import { SectionHeader } from '@/shared/ui/SectionHeader';
import { Skeleton } from '@/shared/ui/Skeleton';
import { isApiError } from '@/shared/utils/apply-api-error';
import { pluralUk } from '@/shared/utils/format';
import { useStartQuiz } from '@/features/quiz/hooks/use-quiz';
import { useMistakes } from '@/features/statistics/hooks/use-statistics';
import { SectionError } from '@/features/statistics/components/SectionError';
import type { MistakeGroup } from '@/features/statistics/types/statistics.types';

/**
 * Topics the reader still answers incorrectly, with a one-tap practice quiz
 * over exactly those questions (docs/04-api/statistics.md §8a).
 *
 * A question leaves this list as soon as it is answered correctly, so an
 * empty state here is success, not absence of data — the copy says so rather
 * than nudging the reader to go generate some mistakes.
 *
 * Practice starts directly instead of routing through the Quiz Start form,
 * which the subjects browser deliberately does not bypass. The difference is
 * that nothing is left to configure: the subject, topic, and question count
 * are all fixed by the mistake set itself, and sending the reader to a form
 * to re-pick a count larger than the set would only earn them a 409.
 */
export function MistakesSection(): React.JSX.Element {
  const mistakes = useMistakes();
  const navigate = useNavigate();
  const startQuiz = useStartQuiz();
  const [practisingTopicId, setPractisingTopicId] = useState<string | null>(null);

  const practise = (group: MistakeGroup): void => {
    setPractisingTopicId(group.topicId);
    startQuiz.mutate(
      {
        subjectId: group.subjectId,
        topicId: group.topicId,
        questionCount: group.mistakeCount,
        timerEnabled: false,
        onlyMistakes: true,
      },
      {
        onSuccess: (session) => navigate(generatePath(ROUTES.quizSession, { sessionId: session.sessionId })),
        onError: (error) => {
          setPractisingTopicId(null);
          // The backend's own wording is the useful one here — it separates
          // "you already fixed these" from a genuine failure.
          toast.error(isApiError(error) ? error.message : 'Не вдалося почати тренування.');
        },
      },
    );
  };

  return (
    <section>
      <SectionHeader
        title="Робота над помилками"
        description="Питання, на які ви востаннє відповіли неправильно."
      />
      {mistakes.isPending ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 2 }).map((_, index) => (
            <Skeleton key={index} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : mistakes.isError ? (
        <Card>
          <SectionError onRetry={() => void mistakes.refetch()} />
        </Card>
      ) : mistakes.data.length === 0 ? (
        <Card>
          <EmptyState
            title="Невиправлених помилок немає"
            description="Щойно ви відповісте на питання правильно, воно зникає з цього списку."
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {mistakes.data.map((group) => (
            <Card
              key={group.topicId}
              className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="text-text-primary font-medium">{group.topicName}</p>
                <p className="text-text-muted text-sm">
                  {group.subjectName} · {group.mistakeCount}{' '}
                  {pluralUk(group.mistakeCount, 'помилка', 'помилки', 'помилок')}
                </p>
              </div>
              <Button
                size="sm"
                variant="secondary"
                className="shrink-0"
                isLoading={startQuiz.isPending && practisingTopicId === group.topicId}
                disabled={startQuiz.isPending}
                onClick={() => practise(group)}
              >
                Потренуватись
              </Button>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
