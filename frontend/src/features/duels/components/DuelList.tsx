import { generatePath, Link } from 'react-router-dom';
import { ROUTES } from '@/shared/constants/routes';
import { DuelMode } from '@/shared/types/enums';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Skeleton } from '@/shared/ui/Skeleton';
import { formatShortDate, pluralUk } from '@/shared/utils/format';
import { useDuels } from '@/features/duels/hooks/use-duels';
import type { DuelView } from '@/features/duels/types/duel.types';
import {
  myOutcome,
  playerName,
  STANCE_LABEL,
  STANCE_ORDER,
  stanceOf,
  theirSide,
  type DuelStance,
} from '@/features/duels/lib/duel-state';

interface DuelListProps {
  userId: string;
}

/** Stances the viewer can act on — these carry the accent rule and sort first. */
const ACTIONABLE: DuelStance[] = ['LIVE_NOW', 'INVITE_RECEIVED', 'MY_TURN'];

/**
 * Every duel, ordered by what it wants from the viewer rather than by date.
 *
 * A duel list sorted newest-first buries the one invitation waiting on an
 * answer under a week of finished games. Anything needing an action comes
 * first and carries an accent rule; the rest falls back to newest-first within
 * its group.
 */
export function DuelList({ userId }: DuelListProps): React.JSX.Element {
  const duels = useDuels();

  if (duels.isPending) {
    return (
      <div className="flex flex-col gap-px">
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
    );
  }

  if (duels.isError) {
    return (
      <EmptyState title="Не вдалося завантажити дуелі" description="Спробуйте оновити сторінку за хвилину." />
    );
  }

  if (duels.data.length === 0) {
    return (
      <EmptyState
        title="Дуелей ще не було"
        description="Викличте когось за ніком — суперник отримає запрошення і два дні на відповідь."
      />
    );
  }

  const ordered = [...duels.data].sort((a, b) => {
    const byStance = STANCE_ORDER.indexOf(stanceOf(a, userId)) - STANCE_ORDER.indexOf(stanceOf(b, userId));
    return byStance !== 0 ? byStance : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <ul className="divide-border border-border divide-y border-t">
      {ordered.map((duel) => (
        <DuelRow key={duel.id} duel={duel} userId={userId} />
      ))}
    </ul>
  );
}

function DuelRow({ duel, userId }: { duel: DuelView; userId: string }): React.JSX.Element {
  const stance = stanceOf(duel, userId);
  const outcome = myOutcome(duel, userId);
  const opponent = theirSide(duel, userId);
  const actionable = ACTIONABLE.includes(stance);

  return (
    <li>
      <Link
        to={generatePath(stance === 'LIVE_NOW' ? ROUTES.liveDuel : ROUTES.duel, { duelId: duel.id })}
        className="hover:bg-surface-elevated flex items-center justify-between gap-4 py-5 pr-2 transition-colors"
      >
        {/* The accent rule marks the rows that want something from you, so the
            list can be scanned down one edge instead of read. */}
        <div
          className={`self-stretch border-l-2 pl-4 ${actionable ? 'border-primary' : 'border-transparent'}`}
        >
          <p className="text-text-primary font-medium">{playerName(opponent)}</p>
          <p className="text-text-muted mt-1 text-xs">
            {duel.subject.name}
            {duel.topic && ` · ${duel.topic.name}`} · {duel.questionCount}{' '}
            {pluralUk(duel.questionCount, 'питання', 'питання', 'питань')}
            {duel.mode === DuelMode.LIVE && ` · наживо, ${duel.secondsPerQuestion ?? ''} с`} ·{' '}
            {formatShortDate(duel.createdAt)}
          </p>
        </div>

        <div className="shrink-0 text-right">
          {outcome ? (
            <p
              className={`font-display text-lg font-bold ${
                outcome === 'WON'
                  ? 'text-primary'
                  : outcome === 'LOST'
                    ? 'text-text-secondary'
                    : 'text-text-secondary'
              }`}
            >
              {outcome === 'WON' ? 'Виграш' : outcome === 'LOST' ? 'Поразка' : 'Нічия'}
            </p>
          ) : (
            <p
              className={`text-xs tracking-[0.14em] uppercase ${
                actionable ? 'text-primary' : 'text-text-muted'
              }`}
            >
              {STANCE_LABEL[stance]}
            </p>
          )}
        </div>
      </Link>
    </li>
  );
}
