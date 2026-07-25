import { ChangePasswordForm } from '@/features/user/components/ChangePasswordForm';
import { DeleteAccountSection } from '@/features/user/components/DeleteAccountSection';

/**
 * `/settings` (RequireAuth) — account settings. Hosts the two account-security
 * actions: change password and delete account. The platform exposes a single
 * authenticated account route for these (docs/05-frontend/routing.md §5), so
 * both live here as distinct sections. Preference settings (language, theme,
 * public profile) are a separate, later feature.
 */
export function SettingsPage(): React.JSX.Element {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <h1 className="text-text-primary text-2xl font-semibold">Account settings</h1>
      <ChangePasswordForm />
      <DeleteAccountSection />
    </div>
  );
}
