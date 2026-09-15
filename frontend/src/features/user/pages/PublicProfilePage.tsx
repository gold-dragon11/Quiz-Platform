import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ROUTES } from '@/shared/constants/routes';
import { useCurrentUser } from '@/shared/hooks/use-current-user';
import { Avatar } from '@/shared/ui/Avatar';
import { FigureGrid } from '@/shared/ui/FigureGrid';
import { Skeleton } from '@/shared/ui/Skeleton';
import { isApiError } from '@/shared/utils/apply-api-error';
import { formatNumber, formatPercent, formatShortDate, pluralUk } from '@/shared/utils/format';
import { useAuthStore } from '@/stores/auth-store';
import { usePublicProfile } from '@/features/user/hooks/use-public-profile';
import type { PublicProfile } from '@/features/user/types/user.types';

/**
 * `/u/:username` — an account as anyone may see it, signed in or not
 * (docs/01-prd/profile.md §5, docs/04-api/users.md §12).
 *
 * What it shows is exactly what the endpoint returns, and nothing is fetched
 * besides it: no groups, no history, no answers. The owner can hide the page in
 * settings, and a hidden page is indistinguishable from one that never
 * existed — the API answers both with the same 404, and so does this screen.
 *
 * Kept out of search engines. The link is meant to be passed on by the person
 * it belongs to; most of them are school students, and a page of theirs turning
 * up when somebody searches their name is not what sharing a link agreed to.
 */
export function PublicProfilePage(): React.JSX.Element {
  const { username = '' } = useParams();
  const profile = usePublicProfile(username);

  useNoIndex();

  return (
    <div className="w-full max-w-2xl py-16">
      <Link
        to={ROUTES.home}
        aria-label="L&S — на головну"
        className="bg-primary inline-flex h-10 items-center rounded-xl px-3 text-lg font-extrabold tracking-tight text-white"
      >
        L&amp;S
      </Link>

      {profile.isPending ? (
        <ProfileSkeleton />
      ) : profile.isError ? (
        <Unavailable notFound={isApiError(profile.error) && profile.error.status === 404} />
      ) : (
        <ProfileView profile={profile.data} />
      )}
    </div>
  );
}

function ProfileView({ profile }: { profile: PublicProfile }): React.JSX.Element {
  const status = useAuthStore((state) => state.status);
  const { data: me } = useCurrentUser();
  const isOwner = me?.profile?.username === profile.username;

  return (
    <>
      <p className="text-text-muted mt-14 text-xs tracking-[0.18em] uppercase">Профіль на L&amp;S</p>

      <div className="mt-6 flex items-center gap-5">
        <Avatar
          size="lg"
          imageUrl={profile.avatar?.imageUrl}
          alt={`Аватар ${profile.displayName}`}
          fallback={profile.displayName.charAt(0)}
        />
        <div className="min-w-0">
          <h1 className="text-text-primary font-display text-3xl font-bold break-words sm:text-4xl">
            {profile.displayName}
          </h1>
          <p className="text-text-muted mt-1 text-sm">
            @{profile.username} · з {formatShortDate(profile.registrationDate)}
          </p>
        </div>
      </div>

      {profile.bio && (
        <p className="text-text-secondary mt-8 max-w-xl text-base leading-relaxed break-words">
          {profile.bio}
        </p>
      )}

      <FigureGrid
        className="mt-10"
        figures={[
          { value: formatNumber(profile.currentLevel), label: 'рівень' },
          { value: formatNumber(profile.totalXP), label: 'XP' },
          {
            value: formatNumber(profile.completedQuizzes),
            label: pluralUk(profile.completedQuizzes, 'тест', 'тести', 'тестів'),
            // Accuracy of nothing is not 0% — it is not a number yet.
            hint:
              profile.completedQuizzes > 0
                ? `середня точність ${formatPercent(profile.averageAccuracy)}`
                : 'ще жодного',
          },
        ]}
      />

      {isOwner ? (
        <p className="border-primary text-text-secondary mt-12 max-w-xl border-l pl-5 text-sm">
          Так ваш профіль бачать інші — навіть без акаунта. Приховати його можна{' '}
          <Link to={ROUTES.settings} className="text-primary underline underline-offset-4">
            у налаштуваннях
          </Link>
          .
        </p>
      ) : status === 'authenticated' ? (
        <p className="text-text-muted mt-12 text-sm">
          <Link to={ROUTES.dashboard} className="text-text-secondary underline underline-offset-4">
            Повернутися до своїх завдань
          </Link>
        </p>
      ) : (
        <p className="text-text-muted mt-12 max-w-xl text-sm">
          L&amp;S — тести, пробний НМТ і повторення помилок з української, математики, історії та англійської.{' '}
          <Link to={ROUTES.register} className="text-primary underline underline-offset-4">
            Створити акаунт
          </Link>
        </p>
      )}
    </>
  );
}

function Unavailable({ notFound }: { notFound: boolean }): React.JSX.Element {
  return (
    <div className="mt-14">
      <h1 className="text-text-primary font-display text-3xl font-bold">
        {notFound ? 'Профіль недоступний' : 'Не вдалося завантажити профіль'}
      </h1>
      <p className="text-text-secondary mt-4 max-w-xl text-sm">
        {/* One sentence for both cases on purpose: saying «hidden» would tell a
            stranger that the username exists. */}
        {notFound
          ? 'Такого профілю немає, або його власник вирішив його не показувати.'
          : 'Спробуйте оновити сторінку трохи згодом.'}
      </p>
      <Link to={ROUTES.home} className="text-primary mt-8 inline-block text-sm underline underline-offset-4">
        На головну
      </Link>
    </div>
  );
}

function ProfileSkeleton(): React.JSX.Element {
  return (
    <div className="mt-14">
      <Skeleton className="h-3 w-32" />
      <div className="mt-6 flex items-center gap-5">
        <Skeleton className="size-16 rounded-full" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-9 w-56" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>
      <Skeleton className="mt-10 h-28" />
    </div>
  );
}

/** Adds `<meta name="robots" content="noindex">` for as long as the page is open. */
function useNoIndex(): void {
  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex';
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);
}
