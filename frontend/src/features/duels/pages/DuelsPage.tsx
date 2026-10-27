import { PageHeader } from '@/shared/ui/PageHeader';
import { Skeleton } from '@/shared/ui/Skeleton';
import { useCurrentUser } from '@/shared/hooks/use-current-user';
import { ActiveQuizBanner } from '@/features/quiz/components/ActiveQuizBanner';
import { ChallengeForm } from '@/features/duels/components/ChallengeForm';
import { DuelList } from '@/features/duels/components/DuelList';
import { LivePlaySection } from '@/features/duels/live/LivePlaySection';

/**
 * `/duels` (RequireAuth) — play somebody now, challenge somebody for later, and
 * see every duel you are in (docs/02-domain/duel.md).
 *
 * Live first: it is the one that needs the other person online this minute.
 * The asynchronous challenge stays below — both sit the same paper whenever
 * they like — and is what a live challenge falls back to when the opponent is
 * away. The demo shows only that one (duel.md §6).
 */
export function DuelsPage(): React.JSX.Element {
  const currentUser = useCurrentUser();

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Дуелі" />

      <ActiveQuizBanner className="mt-8" />

      {currentUser.data && !currentUser.data.isDemo && (
        <section className="mt-12">
          <h2 className="section-title border-border border-b pb-3">Грати наживо</h2>
          <div className="mt-6">
            <LivePlaySection />
          </div>
        </section>
      )}

      <section className="mt-16">
        <h2 className="section-title border-border border-b pb-3">Викликати на потім</h2>
        <div className="mt-6">
          <ChallengeForm />
        </div>
      </section>

      <section className="mt-16">
        <h2 className="section-title mb-6">Ваші дуелі</h2>
        {currentUser.data ? <DuelList userId={currentUser.data.id} /> : <Skeleton className="h-40" />}
      </section>
    </div>
  );
}
