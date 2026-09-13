import { PageHeader } from '@/shared/ui/PageHeader';
import { Skeleton } from '@/shared/ui/Skeleton';
import { useCurrentUser } from '@/shared/hooks/use-current-user';
import { ActiveQuizBanner } from '@/features/quiz/components/ActiveQuizBanner';
import { ChallengeForm } from '@/features/duels/components/ChallengeForm';
import { DuelList } from '@/features/duels/components/DuelList';

/**
 * `/duels` (RequireAuth) — challenge somebody, and see every duel you are in.
 *
 * Asynchronous by design: both players sit the same paper whenever they like
 * and the result is a comparison. Nothing here waits on anybody being online,
 * which is why this half exists before the live one.
 */
export function DuelsPage(): React.JSX.Element {
  const currentUser = useCurrentUser();

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        eyebrow="Змагання"
        title="Дуелі"
        lead="Один і той самий папір для двох. Виграє точніший, а за рівної точності — швидший. Грати можна коли завгодно: суперник не мусить бути онлайн."
      />

      <ActiveQuizBanner className="mt-8" />

      <section className="mt-12">
        <h2 className="text-text-muted border-border border-b pb-3 text-xs tracking-[0.18em] uppercase">
          Викликати
        </h2>
        <div className="mt-6">
          <ChallengeForm />
        </div>
      </section>

      <section className="mt-16">
        <h2 className="text-text-muted mb-6 text-xs tracking-[0.18em] uppercase">Ваші дуелі</h2>
        {currentUser.data ? <DuelList userId={currentUser.data.id} /> : <Skeleton className="h-40" />}
      </section>
    </div>
  );
}
