import { useEffect, useRef } from 'react';
import { generatePath, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LEARNER_ROLES } from '@/shared/constants/roles';
import { ROUTES } from '@/shared/constants/routes';
import { Button } from '@/shared/ui/Button';
import { Modal } from '@/shared/ui/Modal';
import { useCurrentUser } from '@/shared/hooks/use-current-user';
import { pluralUk } from '@/shared/utils/format';
import { connectLive, disconnectLive, liveActions, useLiveStore } from '@/features/duels/live/live-client';
import { useServerCountdown } from '@/features/duels/live/use-server-countdown';

/**
 * Keeps the live duel socket open while a learner is in the app, and does the
 * two things that must work on any page: showing a challenge that has just
 * arrived, and taking both players to the game the moment it begins
 * (docs/02-domain/duel.md §5.1).
 *
 * A route wrapper rather than part of the shell: the shell is shared and
 * knows no features. Demo accounts and teachers get no socket at all — the
 * server would turn them away anyway.
 */
export function LiveDuelHost(): React.JSX.Element {
  const { data: user } = useCurrentUser();
  const eligible =
    user !== undefined && !user.isDemo && (LEARNER_ROLES as readonly string[]).includes(user.role);

  useEffect(() => {
    if (!eligible) {
      return;
    }
    connectLive();
    return () => disconnectLive();
  }, [eligible]);

  return (
    <>
      <Outlet />
      {eligible && (
        <>
          <GameRedirect />
          <IncomingInviteDialog />
        </>
      )}
    </>
  );
}

/** Opens the game screen once, when a game this player is in starts. */
function GameRedirect(): null {
  const game = useLiveStore((state) => state.game);
  const navigate = useNavigate();
  const location = useLocation();
  const opened = useRef<string | null>(null);

  useEffect(() => {
    if (!game || game.phase === 'finished' || opened.current === game.duelId) {
      return;
    }
    opened.current = game.duelId;
    const path = generatePath(ROUTES.liveDuel, { duelId: game.duelId });
    if (location.pathname !== path) {
      navigate(path);
    }
  }, [game, location.pathname, navigate]);

  return null;
}

function IncomingInviteDialog(): React.JSX.Element | null {
  const incoming = useLiveStore((state) => state.incoming);
  const left = Math.ceil(useServerCountdown(incoming?.expiresAt ?? null) / 1000);

  if (!incoming) {
    return null;
  }

  const who = incoming.from.displayName ?? (incoming.from.username ? `@${incoming.from.username}` : 'Хтось');
  const paper = [
    incoming.subject?.name,
    incoming.topic?.name,
    `${incoming.count} ${pluralUk(incoming.count, 'питання', 'питання', 'питань')}`,
    `${incoming.seconds} с на кожне`,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Modal
      open
      title="Виклик на дуель наживо"
      onClose={() => void liveActions.respond(incoming.inviteId, false)}
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => void liveActions.respond(incoming.inviteId, false)}>
            Відхилити
          </Button>
          <Button onClick={() => void liveActions.respond(incoming.inviteId, true)}>Прийняти</Button>
        </div>
      }
    >
      <p className="text-text-primary">{who} викликає вас зараз.</p>
      <p className="text-text-muted mt-2 text-sm">{paper}</p>
      <p className="text-text-muted mt-6 text-sm tabular-nums">Виклик згасне за {left} с</p>
    </Modal>
  );
}
