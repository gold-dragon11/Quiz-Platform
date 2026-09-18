import { formatDuration, formatPercent } from '@/shared/utils/format';
import type { DuelPlayer, DuelView } from '@/features/duels/types/duel.types';
import { myOutcome, mySide, playerName, theirSide } from '@/features/duels/lib/duel-state';

interface DuelScoreboardProps {
  duel: DuelView;
  userId: string;
}

/**
 * The head-to-head sheet: two sides facing each other across one rule.
 *
 * Scores stay hidden until both players finish — that is the backend's rule,
 * not a display choice, and the blank side is worth drawing rather than
 * hiding. Seeing an empty column where a number will be is the whole tension
 * of an asynchronous duel; collapsing it into "чекаємо на суперника" throws
 * that away.
 */
export function DuelScoreboard({ duel, userId }: DuelScoreboardProps): React.JSX.Element {
  const me = mySide(duel, userId);
  const them = theirSide(duel, userId);
  const outcome = myOutcome(duel, userId);

  return (
    <div>
      <div className="border-border grid grid-cols-2 border-b">
        <Side player={me} caption="Ви" isMe highlight={outcome === 'WON'} />
        <Side
          player={them}
          caption={playerName(them)}
          highlight={outcome === 'LOST'}
          className="border-border border-l pl-5 sm:pl-8"
        />
      </div>

      {outcome && (
        <p className="text-text-secondary mt-6 text-sm">
          {outcome === 'WON' && 'Ви виграли цю дуель.'}
          {outcome === 'LOST' && `Цього разу перемога за ${playerName(them)}.`}
          {outcome === 'DRAW' && 'Нічия — однакова точність за однаковий час.'}
          {duel.forfeitedById
            ? duel.forfeitedById === userId
              ? ' Ви здалися посеред гри.'
              : ` ${playerName(them)} — здача посеред гри.`
            : ' Переможця визначає точність; за рівної точності — час.'}
        </p>
      )}
    </div>
  );
}

function Side({
  player,
  caption,
  isMe = false,
  highlight,
  className = '',
}: {
  player: DuelPlayer;
  caption: string;
  isMe?: boolean;
  highlight: boolean;
  className?: string;
}): React.JSX.Element {
  // Impersonal rather than "зіграв(-ла)": the platform does not know anybody's
  // gender and should not be guessing at it in brackets.
  const state = player.finished
    ? isMe
      ? 'Вашу половину зіграно'
      : 'Половину зіграно, рахунок закритий'
    : isMe
      ? 'Вашу половину ще не зіграно'
      : 'Половину ще не зіграно';

  return (
    <div className={`flex flex-col pt-2 pb-8 ${className}`}>
      {/* Not uppercased: one side of this pair is a person's chosen
          username, and shouting it back at them in capitals is both ugly and
          wrong — usernames are not ours to re-case. */}
      <p className="text-text-muted text-xs tracking-[0.14em]">{caption}</p>

      {player.score ? (
        <>
          <p
            className={`font-display mt-4 text-5xl leading-none font-bold lining-nums sm:text-6xl ${
              highlight ? 'text-primary' : 'text-text-primary'
            }`}
          >
            {player.score.correctAnswers}
            <span className="text-text-muted text-2xl font-normal sm:text-3xl">
              /{player.score.totalQuestions}
            </span>
          </p>
          <p className="text-text-secondary mt-3 text-sm">
            {formatPercent(player.score.accuracy)}
            {player.score.durationSeconds !== null &&
              player.score.durationSeconds > 0 &&
              ` · ${formatDuration(player.score.durationSeconds)}`}
          </p>
        </>
      ) : (
        <>
          {/* The withheld score keeps its slot at the same size, so the sheet
              does not jump when the second player finishes. */}
          <p className="text-text-muted font-display mt-4 text-5xl leading-none font-bold opacity-25 sm:text-6xl">
            —
          </p>
          <p className="text-text-muted mt-3 text-sm">{state}</p>
        </>
      )}
    </div>
  );
}
