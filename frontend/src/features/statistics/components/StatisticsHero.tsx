import { Badge } from '@/shared/ui/Badge';
import { Card } from '@/shared/ui/Card';
import { ProgressBar } from '@/shared/ui/ProgressBar';
import { Skeleton } from '@/shared/ui/Skeleton';
import { useCountUp } from '@/shared/hooks/use-count-up';
import { formatNumber } from '@/shared/utils/format';
import { useOverallStatistics } from '@/features/statistics/hooks/use-statistics';
import { SectionError } from '@/features/statistics/components/SectionError';

/**
 * Statistics hero (docs/01-prd/dashboard.md §5, docs/04-api/statistics.md §4):
 * level, total XP (count-up), the XP progress bar, XP until the next level,
 * and completion percentage. Powered by the shared overall-statistics query.
 */
export function StatisticsHero(): React.JSX.Element {
  const overall = useOverallStatistics();

  if (overall.isPending) {
    return (
      <Card className="flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-6 w-24" />
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
        <Skeleton className="h-4 w-48" />
      </Card>
    );
  }

  if (overall.isError) {
    return (
      <Card>
        <SectionError message="We couldn't load your progress." onRetry={() => void overall.refetch()} />
      </Card>
    );
  }

  return <HeroContent data={overall.data} />;
}

function HeroContent({
  data,
}: {
  data: {
    currentLevel: number;
    totalXP: number;
    xpForNextLevel: number;
    completionPercent: number;
  };
}): React.JSX.Element {
  const xp = useCountUp(data.totalXP);
  const xpToNext = Math.max(0, data.xpForNextLevel - data.totalXP);
  const completion = Math.round(data.completionPercent);

  return (
    <Card className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Badge tone="info">Level {data.currentLevel}</Badge>
          <span className="text-text-primary text-3xl font-semibold">
            {formatNumber(xp)} <span className="text-text-muted text-lg font-medium">XP</span>
          </span>
        </div>
        <span className="text-text-secondary text-sm font-medium">
          {completion}% to Level {data.currentLevel + 1}
        </span>
      </div>

      <ProgressBar value={data.completionPercent} label={`Progress to level ${data.currentLevel + 1}`} />

      <p className="text-text-muted text-sm">
        {xpToNext > 0
          ? `${formatNumber(xpToNext)} XP until Level ${data.currentLevel + 1}`
          : `You're ready for Level ${data.currentLevel + 1}!`}
      </p>
    </Card>
  );
}
