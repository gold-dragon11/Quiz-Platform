import { Skeleton } from '@/shared/ui/Skeleton';
import { useCountUp } from '@/shared/hooks/use-count-up';
import { formatNumber } from '@/shared/utils/format';
import { useOverallStatistics } from '@/features/statistics/hooks/use-statistics';
import { SectionError } from '@/features/statistics/components/SectionError';
import type { OverallStatistics } from '@/features/statistics/types/statistics.types';

/**
 * Where the reader stands: total XP, the level it buys, and the distance to
 * the next one (docs/04-api/statistics.md §4).
 *
 * The card this replaced put a pill badge, a rounded progress bar and three
 * sentences of the same fact inside one box — «68% до рівня 8», the bar, and
 * «Ще 520 XP до рівня 8» all said one thing three ways. Here the percentage is
 * the bar (a hairline, filled), and the only sentence is the one the bar
 * cannot say: how much XP is actually left.
 */
export function LevelStanding(): React.JSX.Element {
  const overall = useOverallStatistics();

  if (overall.isPending) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-14 w-56" />
        <Skeleton className="h-px w-full" />
      </div>
    );
  }

  if (overall.isError) {
    return (
      <SectionError message="Не вдалося завантажити ваш рівень." onRetry={() => void overall.refetch()} />
    );
  }

  return <Standing data={overall.data} />;
}

function Standing({ data }: { data: OverallStatistics }): React.JSX.Element {
  const xp = useCountUp(data.totalXP);
  const xpToNext = Math.max(0, data.xpForNextLevel - data.totalXP);
  const nextLevel = data.currentLevel + 1;
  // The bar is a measurement, not a decoration: clamped so a level boundary
  // crossed between two renders can never draw past the rule it sits on.
  const filled = Math.min(100, Math.max(0, data.completionPercent));

  return (
    <section aria-label="Рівень і досвід">
      <p className="text-text-muted text-xs tracking-[0.18em] uppercase">Рівень {data.currentLevel}</p>

      <p className="text-text-primary font-display mt-3 text-5xl font-bold lining-nums sm:text-6xl">
        {formatNumber(xp)}
        <span className="text-text-muted ml-3 text-lg font-normal tracking-[0.18em] uppercase">XP</span>
      </p>

      <div className="bg-border mt-8 h-px w-full" aria-hidden="true">
        <div className="bg-primary h-px" style={{ width: `${filled}%` }} />
      </div>

      <p className="text-text-muted mt-3 text-sm">
        {xpToNext > 0
          ? `Ще ${formatNumber(xpToNext)} XP до рівня ${nextLevel}.`
          : `Наступний тест відкриє рівень ${nextLevel}.`}
      </p>
    </section>
  );
}
