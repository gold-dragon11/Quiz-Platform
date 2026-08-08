import { Avatar } from '@/shared/ui/Avatar';
import { Badge } from '@/shared/ui/Badge';
import { Card } from '@/shared/ui/Card';
import { ProgressBar } from '@/shared/ui/ProgressBar';
import { Skeleton } from '@/shared/ui/Skeleton';
import { useCurrentUser } from '@/shared/hooks/use-current-user';
import { formatNumber } from '@/shared/utils/format';
import { useOverallStatistics } from '@/features/dashboard/hooks/use-dashboard';
import { SectionError } from '@/features/dashboard/components/SectionError';

/**
 * Welcome + Progress Overview combined into one hero (docs/01-prd/dashboard.md
 * §4–§5): avatar, greeting, level, total XP, and the XP progress bar toward
 * the next level. Identity comes from GET /auth/me (shared useCurrentUser);
 * level/XP from GET /statistics.
 */
export function WelcomeHero(): React.JSX.Element {
  const { data: user } = useCurrentUser();
  const overall = useOverallStatistics();

  const displayName = user?.profile?.displayName ?? 'there';
  const username = user?.profile?.username;
  const initial = displayName.charAt(0) || username?.charAt(0) || '?';

  return (
    <Card className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Avatar size="lg" imageUrl={user?.avatar?.imageUrl} fallback={initial} alt="Ваш аватар" />
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-text-primary truncate text-2xl font-semibold">З поверненням, {displayName}.</h1>
          {username && <p className="text-text-muted truncate text-sm">@{username}</p>}
        </div>
      </div>

      {overall.isPending ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-5 w-20" />
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
          <Skeleton className="h-4 w-40" />
        </div>
      ) : overall.isError ? (
        <SectionError message="Не вдалося завантажити ваш прогрес." onRetry={() => void overall.refetch()} />
      ) : (
        <ProgressBlock
          currentLevel={overall.data.currentLevel}
          totalXP={overall.data.totalXP}
          xpForNextLevel={overall.data.xpForNextLevel}
          completionPercent={overall.data.completionPercent}
        />
      )}
    </Card>
  );
}

interface ProgressBlockProps {
  currentLevel: number;
  totalXP: number;
  xpForNextLevel: number;
  completionPercent: number;
}

function ProgressBlock({
  currentLevel,
  totalXP,
  xpForNextLevel,
  completionPercent,
}: ProgressBlockProps): React.JSX.Element {
  const xpToNext = Math.max(0, xpForNextLevel - totalXP);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4">
        <Badge tone="info">Рівень {currentLevel}</Badge>
        <span className="text-text-secondary text-sm font-medium">{formatNumber(totalXP)} XP</span>
      </div>
      <ProgressBar value={completionPercent} label={`Прогрес до рівня ${currentLevel + 1}`} />
      <p className="text-text-muted text-sm">
        {xpToNext > 0
          ? `${formatNumber(xpToNext)} XP до рівня ${currentLevel + 1}`
          : `Ви готові до рівня ${currentLevel + 1}!`}
      </p>
    </div>
  );
}
