import { useNmtCountdown } from '@/features/nmt-calendar/hooks/use-nmt-calendar';

/**
 * «до основної сесії НМТ 143 дні 6 годин», or nothing at all (decision 49).
 *
 * «Основної сесії», not «вашого НМТ»: each learner sits on their own day from
 * the invitation, and the countdown runs to the first day of the session. A
 * line that promised more precision than it has would be the first thing in
 * the product that was not true.
 */
export function NmtCountdownText({
  sentence = false,
  prefix = '',
}: {
  /** Starts with a capital, as a sentence of its own. */
  sentence?: boolean;
  /** Put before the text when there is one, such as « · » after a date. */
  prefix?: string;
}): React.JSX.Element | null {
  const countdown = useNmtCountdown();
  if (!countdown) {
    return null;
  }
  return (
    <>
      {prefix}
      {sentence ? 'До' : 'до'} основної сесії НМТ <span className="tabular-nums">{countdown.text}</span>
    </>
  );
}
