import { Skeleton } from '@/shared/ui/Skeleton';
import { formatNumber, pluralUk } from '@/shared/utils/format';
import { useProgress } from '@/features/statistics/hooks/use-statistics';
import { SectionError } from '@/features/statistics/components/SectionError';
import type { Progress } from '@/features/statistics/types/statistics.types';

/**
 * Where the reader stands: topics mastered, out of every topic there is
 * (decision 46).
 *
 * This place used to hold XP and a level. XP was the quiz's accuracy paid out
 * as points, so a five-question test at 100% outearned a mock paper at 80%,
 * and the level it bought unlocked nothing. A mastered topic is a claim about
 * what the reader knows, it can be checked against the rule printed under it,
 * and it is the unit the exam itself is built from.
 */
export function ProgressStanding(): React.JSX.Element {
  const progress = useProgress();

  if (progress.isPending) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-14 w-56" />
        <Skeleton className="h-px w-full" />
      </div>
    );
  }

  if (progress.isError) {
    return (
      <SectionError message="Не вдалося завантажити ваш прогрес." onRetry={() => void progress.refetch()} />
    );
  }

  return <Standing data={progress.data} />;
}

function Standing({ data }: { data: Progress }): React.JSX.Element {
  const total = data.subjects.reduce((sum, subject) => sum + subject.topicsTotal, 0);
  const mastered = data.subjects.reduce((sum, subject) => sum + subject.mastered, 0);
  const inProgress = data.subjects.reduce((sum, subject) => sum + subject.inProgress, 0);
  // A measurement, not a decoration: the rule under it says what it counts.
  const filled = total === 0 ? 0 : Math.min(100, (mastered / total) * 100);

  return (
    <section aria-label="Освоєні теми">
      <p className="text-text-muted text-xs">Освоєно тем</p>

      <p className="text-text-primary font-display mt-3 text-5xl lining-nums sm:text-6xl">
        {formatNumber(mastered)}
        <span className="text-text-muted ml-3 text-lg font-normal">з {formatNumber(total)}</span>
      </p>

      <div className="bg-border mt-8 h-px w-full" aria-hidden="true">
        <div className="bg-primary h-px" style={{ width: `${filled}%` }} />
      </div>

      <p className="text-text-secondary mt-3 text-sm">
        {inProgress > 0
          ? `Ще ${formatNumber(inProgress)} ${pluralUk(inProgress, 'тема', 'теми', 'тем')} в роботі.`
          : 'Тем у роботі поки немає.'}{' '}
        Виправлено {formatNumber(data.mistakesFixed)}{' '}
        {pluralUk(data.mistakesFixed, 'помилку', 'помилки', 'помилок')}.
      </p>

      <ul className="divide-border border-border mt-8 divide-y border-t">
        {data.subjects.map((subject) => (
          <li key={subject.subjectId} className="flex items-baseline justify-between gap-4 py-3 text-sm">
            <span className="text-text-primary">{subject.subjectName}</span>
            <span className="text-text-secondary tabular-nums">
              {formatNumber(subject.mastered)} з {formatNumber(subject.topicsTotal)}
              {subject.inProgress > 0 && (
                <span className="text-text-muted">, ще {formatNumber(subject.inProgress)} в роботі</span>
              )}
            </span>
          </li>
        ))}
      </ul>

      <p className="text-text-muted mt-4 max-w-2xl text-xs">
        Тема освоєна, коли останні 10 відповідей з неї щонайменше на 80% правильні і жодне її питання не чекає
        на повторення.
      </p>
    </section>
  );
}
