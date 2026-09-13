import { PageHeader } from '@/shared/ui/PageHeader';
import { ChangePasswordForm } from '@/features/user/components/ChangePasswordForm';
import { DeleteAccountSection } from '@/features/user/components/DeleteAccountSection';

/**
 * `/settings` (RequireAuth) — account settings. Hosts the two account-security
 * actions: change password and delete account. The platform exposes a single
 * authenticated account route for these (docs/05-frontend/routing.md §5), so
 * both live here as distinct sections.
 *
 * There is no language preference: the interface is Ukrainian-only, so the
 * backend's `UserSettings.language` is set once at registration and never
 * shown. Theme and public profile remain a later feature. The lead says so —
 * a settings page with two entries reads as broken unless it admits that two
 * is the whole list.
 */
export function SettingsPage(): React.JSX.Element {
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        eyebrow="Акаунт"
        title="Налаштування"
        lead="Поки що тут лише безпека акаунта: пароль і видалення. Інтерфейс україномовний, тож мову обирати не треба."
      />

      <div className="mt-14">
        <ChangePasswordForm />
      </div>

      <div className="mt-20">
        <DeleteAccountSection />
      </div>
    </div>
  );
}
