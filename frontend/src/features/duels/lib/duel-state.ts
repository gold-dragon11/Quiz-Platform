import { DuelMode, DuelStatus } from '@/shared/types/enums';
import type { DuelPlayer, DuelView } from '@/features/duels/types/duel.types';

/**
 * What a duel means *to the person looking at it*.
 *
 * The API returns one symmetric object for both players, which is right — but
 * every screen then has to answer the same question before it can render
 * anything: is this waiting on me, or on them? Answering it in one place keeps
 * the list and the detail page from drifting into two different opinions about
 * whose turn it is.
 */
export type DuelStance =
  | 'LIVE_NOW'
  | 'INVITE_RECEIVED'
  | 'INVITE_SENT'
  | 'MY_TURN'
  | 'WAITING_OPPONENT'
  | 'FINISHED'
  | 'DECLINED'
  | 'EXPIRED';

export function isChallenger(duel: DuelView, userId: string): boolean {
  return duel.challenger.id === userId;
}

/** The viewer's own side. */
export function mySide(duel: DuelView, userId: string): DuelPlayer {
  return isChallenger(duel, userId) ? duel.challenger : duel.opponent;
}

/** The other side. */
export function theirSide(duel: DuelView, userId: string): DuelPlayer {
  return isChallenger(duel, userId) ? duel.opponent : duel.challenger;
}

export function stanceOf(duel: DuelView, userId: string): DuelStance {
  switch (duel.status) {
    case DuelStatus.PENDING:
      return isChallenger(duel, userId) ? 'INVITE_SENT' : 'INVITE_RECEIVED';
    case DuelStatus.ACCEPTED:
      // A live game has no turns: while it is accepted it is being played.
      if (duel.mode === DuelMode.LIVE) {
        return 'LIVE_NOW';
      }
      return mySide(duel, userId).finished ? 'WAITING_OPPONENT' : 'MY_TURN';
    case DuelStatus.COMPLETED:
      return 'FINISHED';
    case DuelStatus.DECLINED:
      return 'DECLINED';
    default:
      return 'EXPIRED';
  }
}

/** Short label for the state, in the viewer's own terms. */
export const STANCE_LABEL: Record<DuelStance, string> = {
  LIVE_NOW: 'іде зараз',
  INVITE_RECEIVED: 'вас викликали',
  INVITE_SENT: 'чекає на відповідь',
  MY_TURN: 'ваш хід',
  WAITING_OPPONENT: 'чекає на суперника',
  FINISHED: 'завершено',
  DECLINED: 'відхилено',
  EXPIRED: 'протерміновано',
};

/** Duels the viewer can still do something about come first. */
export const STANCE_ORDER: DuelStance[] = [
  'LIVE_NOW',
  'INVITE_RECEIVED',
  'MY_TURN',
  'WAITING_OPPONENT',
  'INVITE_SENT',
  'FINISHED',
  'DECLINED',
  'EXPIRED',
];

/** How a finished duel ended, from the viewer's side. */
export function myOutcome(duel: DuelView, userId: string): 'WON' | 'LOST' | 'DRAW' | null {
  if (duel.winner === null) {
    return null;
  }
  if (duel.winner === 'DRAW') {
    return 'DRAW';
  }
  const iWon = duel.winner === (isChallenger(duel, userId) ? 'CHALLENGER' : 'OPPONENT');
  return iWon ? 'WON' : 'LOST';
}

/** The name to show for a player — display name, then username, then a dash. */
export function playerName(player: DuelPlayer): string {
  return player.displayName ?? player.username ?? '—';
}
