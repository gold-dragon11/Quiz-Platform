import { generatePath, useNavigate, useParams } from 'react-router-dom';
import { ROUTES } from '@/shared/constants/routes';
import { Alert } from '@/shared/ui/Alert';
import { Button } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Skeleton } from '@/shared/ui/Skeleton';
import { useCurrentUser } from '@/shared/hooks/use-current-user';
import { formatShortDate, pluralUk } from '@/shared/utils/format';
import { isApiError } from '@/shared/utils/apply-api-error';
import { ActiveQuizBanner } from '@/features/quiz/components/ActiveQuizBanner';
import { DuelScoreboard } from '@/features/duels/components/DuelScoreboard';
import { useDuel, usePlayDuel, useRespondToDuel } from '@/features/duels/hooks/use-duels';
import type { DuelView } from '@/features/duels/types/duel.types';
import { mySide, playerName, stanceOf, theirSide } from '@/features/duels/lib/duel-state';

/**
 * `/duels/:duelId` (RequireAuth) — one duel, from the viewer's side.
 *
 * The page answers one question above everything else: whose turn is it. That
 * decides which of five completely different screens this is — an invitation
 * to answer, a paper to sit, a wait, a result, or a closed case.
 */
export function DuelPage(): React.JSX.Element {
  const { duelId = '' } = useParams();
  const duel = useDuel(duelId);
  const currentUser = useCurrentUser();

  if (duel.isPending || currentUser.isPending) {
    return (
      <div className="mx-auto max-w-4xl">
        <Skeleton className="h-32" />
        <Skeleton className="mt-10 h-40" />
      </div>
    );
  }

  if (duel.isError || !duel.data || !currentUser.data) {
    return (
      <div className="mx-auto max-w-4xl">
        <EmptyState
          title="Дуель не знайдено"
          description="Можливо, її вже немає або вона адресована не вам."
        />
      </div>
    );
  }

  return <DuelDetail duel={duel.data} userId={currentUser.data.id} />;
}

function DuelDetail({ duel, userId }: { duel: DuelView; userId: string }): React.JSX.Element {
  const navigate = useNavigate();
  const { accept, decline } = useRespondToDuel(duel.id);
  const play = usePlayDuel(duel.id);

  const stance = stanceOf(duel, userId);
  const them = theirSide(duel, userId);
  const me = mySide(duel, userId);

  const failure = accept.error ?? decline.error ?? play.error;
  const errorMessage = isApiError(failure)
    ? failure.message
    : failure
      ? 'Не вдалося виконати дію. Спробуйте ще раз.'
      : null;

  function handlePlay(): void {
    play.mutate(undefined, {
      onSuccess: (session) => {
        navigate(generatePath(ROUTES.quizSession, { sessionId: session.sessionId }));
      },
    });
  }

  const paper = `${duel.subject.name}${duel.topic ? ` · ${duel.topic.name}` : ''} · ${
    duel.questionCount
  } ${pluralUk(duel.questionCount, 'питання', 'питання', 'питань')}`;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader eyebrow={paper} title={`Дуель з ${playerName(them)}`} />

      <ActiveQuizBanner className="mt-8" />

      {errorMessage && (
        <Alert variant="error" className="mt-8">
          {errorMessage}
        </Alert>
      )}

      {stance === 'INVITE_RECEIVED' && (
        <section className="mt-12">
          <p className="text-text-secondary max-w-2xl">
            {playerName(them)} викликає вас на дуель. Папір складеться в момент, коли ви приймете виклик — і
            буде однаковий для обох. Відповісти можна до {formatShortDate(duel.expiresAt)}
          </p>
          <div className="mt-8 flex gap-3">
            <Button onClick={() => accept.mutate()} isLoading={accept.isPending}>
              Прийняти виклик
            </Button>
            <Button variant="ghost" onClick={() => decline.mutate()} isLoading={decline.isPending}>
              Відхилити
            </Button>
          </div>
        </section>
      )}

      {stance === 'INVITE_SENT' && (
        <Waiting>
          Чекаємо, поки {playerName(them)} відповість. Виклик живе до {formatShortDate(duel.expiresAt)} —
          після цього він згасне сам.
        </Waiting>
      )}

      {stance === 'MY_TURN' && (
        <section className="mt-12">
          <p className="text-text-secondary max-w-2xl">
            Ваша черга сідати за папір. Рахунок суперника буде закритий, доки ви обоє не завершите — тож грати
            доводиться проти самого завдання, а не проти чужої цифри.
          </p>
          <div className="mt-8">
            <Button onClick={handlePlay} isLoading={play.isPending}>
              {duel.mySessionId ? 'Продовжити' : 'Грати'}
            </Button>
          </div>
        </section>
      )}

      {(stance === 'WAITING_OPPONENT' || stance === 'FINISHED') && (
        <section className="mt-12">
          <DuelScoreboard duel={duel} userId={userId} />
          {stance === 'WAITING_OPPONENT' && (
            <p className="text-text-secondary mt-6 max-w-2xl text-sm">
              Ви своє відіграли. Рахунок відкриється, щойно {playerName(them)} завершить свою половину.
            </p>
          )}
          {me.finished && duel.mySessionId && (
            <div className="mt-8">
              <Button
                variant="secondary"
                onClick={() =>
                  navigate(generatePath(ROUTES.quizResult, { sessionId: duel.mySessionId as string }))
                }
              >
                Мій розбір
              </Button>
            </div>
          )}
        </section>
      )}

      {stance === 'DECLINED' && <Waiting>Виклик відхилено. Можна викликати ще раз, якщо є настрій.</Waiting>}

      {stance === 'EXPIRED' && (
        <Waiting>Виклик протермінувався — на відповідь було два дні. Можна викликати ще раз.</Waiting>
      )}
    </div>
  );
}

/** A terminal or waiting state: a sentence on a rule, with nothing to press. */
function Waiting({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <p className="border-border text-text-secondary mt-12 max-w-2xl border-l pl-5">{children}</p>;
}
