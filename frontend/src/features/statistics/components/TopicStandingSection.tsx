import { useMemo, useState } from 'react';
import { generatePath, useNavigate } from 'react-router-dom';
import { ROUTES } from '@/shared/constants/routes';
import { toast } from '@/stores/toast-store';
import { Skeleton } from '@/shared/ui/Skeleton';
import { isApiError } from '@/shared/utils/apply-api-error';
import { formatPercent, pluralUk } from '@/shared/utils/format';
import { useStartQuiz } from '@/features/quiz/hooks/use-quiz';
import { useMistakes, useTopicStatistics } from '@/features/statistics/hooks/use-statistics';
import { SectionError } from '@/features/statistics/components/SectionError';
import type { MistakeGroup, TopicStatistics } from '@/features/statistics/types/statistics.types';

/** Below this, a topic is worth sitting down with rather than retrying. */
const TROUBLE_THRESHOLD = 60;

/** How many rows open before the reader asks for the rest. */
const VISIBLE_ROWS = 8;

/** One topic, seen through both endpoints at once. */
interface TopicStanding {
  topicId: string;
  topicName: string;
  subjectId: string;
  subjectName: string;
  /** null when no quiz has ever targeted this topic — see the merge note. */
  accuracy: number | null;
  answered: number;
  mistakeCount: number;
}

/**
 * Every topic the reader has touched, weakest first — the only part of this
 * page that answers «що вчити далі» rather than «як я загалом».
 *
 * It merges `/statistics/topics` with `/statistics/mistakes` because neither
 * one is the whole picture, and showing them as two sections would have put
 * two topic lists on one screen ranked by two different rules:
 *
 * - topic statistics count only sessions that targeted a topic, so a reader
 *   who takes subject-wide quizzes has answers in a topic and no row for it;
 * - mistakes are counted from the answers themselves, so they cover those
 *   topics — but only the questions still outstanding, never the ones fixed.
 *
 * A topic present in the second and absent from the first therefore has real
 * mistakes and no measurable accuracy; it shows «—» and says why, instead of
 * being given a 0% it did not earn.
 */
export function TopicStandingSection(): React.JSX.Element {
  const topics = useTopicStatistics();
  const mistakes = useMistakes();
  const [expanded, setExpanded] = useState(false);

  const standings = useMemo(
    () => mergeStandings(topics.data ?? [], mistakes.data ?? []),
    [topics.data, mistakes.data],
  );

  if (topics.isPending || mistakes.isPending) {
    return <Skeleton className="h-64" />;
  }

  // Section isolation: one failed request must not blank the other's list.
  // Only a page with nothing left to draw falls back to the retry.
  if (topics.isError && mistakes.isError) {
    return (
      <SectionError
        message="Не вдалося завантажити теми."
        onRetry={() => {
          void topics.refetch();
          void mistakes.refetch();
        }}
      />
    );
  }

  if (standings.length === 0) {
    return (
      <p className="border-border text-text-secondary max-w-2xl border-l pl-5 text-sm">
        Тут зʼявиться кожна тема, яку ви проходили, — від найслабшої до найсильнішої.
      </p>
    );
  }

  const shown = expanded ? standings : standings.slice(0, VISIBLE_ROWS);
  const hidden = standings.length - shown.length;
  const anyUnmeasured = shown.some((standing) => standing.accuracy === null);

  return (
    <>
      <ul className="divide-border border-border divide-y border-t">
        {shown.map((standing) => (
          <TopicRow key={standing.topicId} standing={standing} />
        ))}
      </ul>

      {/* Said once under the list rather than on every row that needs it: with
          four topics from one subject-wide quiz, the per-row version printed
          the identical sentence four times down the page. */}
      {anyUnmeasured && (
        <p className="text-text-muted mt-5 text-xs">
          «—» стоїть там, де ці питання траплялися лише в тестах з усього предмета, тож окремої точності по
          темі ще немає.
        </p>
      )}

      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="text-text-secondary hover:text-text-primary mt-6 text-sm underline underline-offset-4 transition-colors"
        >
          Показати решту {hidden} {pluralUk(hidden, 'тему', 'теми', 'тем')}
        </button>
      )}
    </>
  );
}

/**
 * Ordered by what the reader can act on first: outstanding mistakes are a
 * quiz that can be started right now, so they outrank a low percentage with
 * nothing left to retry. Accuracy breaks the tie, and a topic with no measured
 * accuracy sorts last within its tier rather than being guessed at.
 */
function mergeStandings(topics: TopicStatistics[], mistakes: MistakeGroup[]): TopicStanding[] {
  const byTopic = new Map<string, TopicStanding>();

  for (const topic of topics) {
    byTopic.set(topic.topicId, {
      topicId: topic.topicId,
      topicName: topic.topicName,
      subjectId: topic.subjectId,
      subjectName: topic.subjectName,
      accuracy: Number.parseFloat(topic.averageAccuracy),
      answered: topic.totalQuestions,
      mistakeCount: 0,
    });
  }

  for (const group of mistakes) {
    const existing = byTopic.get(group.topicId);
    if (existing) {
      existing.mistakeCount = group.mistakeCount;
      continue;
    }
    byTopic.set(group.topicId, {
      topicId: group.topicId,
      topicName: group.topicName,
      subjectId: group.subjectId,
      subjectName: group.subjectName,
      accuracy: null,
      answered: 0,
      mistakeCount: group.mistakeCount,
    });
  }

  return [...byTopic.values()].sort((a, b) => {
    if (a.mistakeCount !== b.mistakeCount) {
      return b.mistakeCount - a.mistakeCount;
    }
    if (a.accuracy === null || b.accuracy === null) {
      return a.accuracy === b.accuracy ? 0 : a.accuracy === null ? 1 : -1;
    }
    return a.accuracy - b.accuracy;
  });
}

function TopicRow({ standing }: { standing: TopicStanding }): React.JSX.Element {
  const navigate = useNavigate();
  const startQuiz = useStartQuiz();
  const [practising, setPractising] = useState(false);

  const trouble = standing.accuracy !== null && standing.accuracy < TROUBLE_THRESHOLD;

  /**
   * Starts straight into the quiz rather than routing through the Quiz Start
   * form: subject, topic and count are all fixed by the mistake set itself,
   * and offering a count larger than the set would only earn the reader a 409.
   */
  const practise = (): void => {
    setPractising(true);
    startQuiz.mutate(
      {
        subjectId: standing.subjectId,
        topicId: standing.topicId,
        questionCount: standing.mistakeCount,
        timerEnabled: false,
        onlyMistakes: true,
      },
      {
        onSuccess: (session) => navigate(generatePath(ROUTES.quizSession, { sessionId: session.sessionId })),
        onError: (error) => {
          setPractising(false);
          // The backend's wording separates "you already fixed these" from a
          // genuine failure; ours could not.
          toast.error(isApiError(error) ? error.message : 'Не вдалося почати тренування.');
        },
      },
    );
  };

  return (
    <li className="py-5">
      <div className="flex items-baseline justify-between gap-4">
        <div className="min-w-0">
          <p className="text-text-primary truncate">{standing.topicName}</p>
          <p className="text-text-muted mt-1 text-xs tracking-[0.18em] uppercase">{standing.subjectName}</p>
        </div>
        <p
          className={`font-display shrink-0 text-2xl font-bold lining-nums ${
            trouble ? 'text-warning' : 'text-text-primary'
          }`}
        >
          {standing.accuracy === null ? '—' : formatPercent(standing.accuracy)}
        </p>
      </div>

      <div className="bg-border mt-4 h-px w-full" aria-hidden="true">
        <div
          className={`h-px ${trouble ? 'bg-warning' : 'bg-primary'}`}
          style={{ width: `${standing.accuracy ?? 0}%` }}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <p className="text-text-muted text-xs">
          {standing.accuracy !== null && (
            <>
              {standing.answered} {pluralUk(standing.answered, 'відповідь', 'відповіді', 'відповідей')}
              {standing.mistakeCount > 0 && ' · '}
            </>
          )}
          {standing.mistakeCount > 0 && (
            <>
              {standing.mistakeCount}{' '}
              {pluralUk(standing.mistakeCount, 'невиправлена', 'невиправлені', 'невиправлених')}{' '}
              {pluralUk(standing.mistakeCount, 'помилка', 'помилки', 'помилок')}
            </>
          )}
        </p>

        {standing.mistakeCount > 0 && (
          <button
            type="button"
            onClick={practise}
            disabled={startQuiz.isPending}
            className="text-primary shrink-0 text-sm underline underline-offset-4 disabled:opacity-60"
          >
            {practising ? 'Готуємо…' : 'Пройти ці питання'}
          </button>
        )}
      </div>
    </li>
  );
}
