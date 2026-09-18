import { useCurrentUser } from '@/shared/hooks/use-current-user';
import { PageHeader } from '@/shared/ui/PageHeader';
import { ChangePasswordForm } from '@/features/user/components/ChangePasswordForm';
import { DeleteAccountSection } from '@/features/user/components/DeleteAccountSection';
import { PublicProfileSection } from '@/features/user/components/PublicProfileSection';

/**
 * `/settings` (RequireAuth) — account settings: who can see the profile, the
 * password, and deleting the account. The platform exposes a single
 * authenticated account route for these (docs/05-frontend/routing.md §5), so
 * they live here as distinct sections.
 *
 * There is no language preference: the interface is Ukrainian-only, so the
 * backend's `UserSettings.language` is set once at registration and never
 * shown. Theme remains a later feature.
 */
export function SettingsPage(): React.JSX.Element {
  const { data: user } = useCurrentUser();

  // A demo account may change none of this, and offering three forms that each
  // answer «forbidden» is worse than saying so once.
  if (user?.isDemo) {
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader eyebrow="Акаунт" title="Налаштування" />
        <p className="border-primary text-text-secondary mt-14 max-w-xl border-l pl-5 text-sm">
          Це демо-акаунт. Пароль, публічність профілю й видалення акаунта тут вимкнені, а щоночі все
          повертається до початкового стану — тож тести й домашку можна проходити без жодних наслідків.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader eyebrow="Акаунт" title="Налаштування" />

      <div className="mt-14">
        <PublicProfileSection />
      </div>

      <div className="mt-20">
        <ChangePasswordForm />
      </div>

      <div className="mt-20">
        <DeleteAccountSection />
      </div>
    </div>
  );
}
