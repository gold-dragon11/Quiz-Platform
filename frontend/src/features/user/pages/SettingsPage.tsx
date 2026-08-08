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
 * shown. Theme and public profile remain a later feature.
 */
export function SettingsPage(): React.JSX.Element {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <h1 className="text-text-primary text-2xl font-semibold">Налаштування акаунта</h1>
      <ChangePasswordForm />
      <DeleteAccountSection />
    </div>
  );
}
