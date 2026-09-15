import { generatePath, Link } from 'react-router-dom';
import { ROUTES } from '@/shared/constants/routes';
import { useCurrentUser } from '@/shared/hooks/use-current-user';
import { toast } from '@/stores/toast-store';
import { Checkbox } from '@/shared/ui/Checkbox';
import { isApiError } from '@/shared/utils/apply-api-error';
import { useSetPublicProfileEnabled } from '@/features/user/hooks/use-public-profile';

/**
 * The public-profile switch (docs/01-prd/settings.md, «Public Profile»).
 *
 * On by default, as the product specifies — which is exactly why the section
 * lists what the page shows, field by field, and says it needs no account to
 * open. A switch labelled only «Публічний профіль» asks the reader to agree to
 * something they cannot see from here.
 */
export function PublicProfileSection(): React.JSX.Element | null {
  const { data: user } = useCurrentUser();
  const username = user?.profile?.username;
  const setEnabled = useSetPublicProfileEnabled(username);

  if (!user || !username) {
    return null;
  }

  const enabled = user.settings?.publicProfileEnabled ?? true;
  const path = generatePath(ROUTES.publicProfile, { username });

  return (
    <section>
      <h2 className="text-text-muted border-border border-b pb-3 text-xs tracking-[0.18em] uppercase">
        Публічний профіль
      </h2>
      <p className="text-text-secondary mt-6 max-w-xl text-sm">
        За адресою{' '}
        <Link to={path} className="text-text-primary underline underline-offset-4 break-all">
          {window.location.host}
          {path}
        </Link>{' '}
        будь-хто, навіть без акаунта, бачить ваші імʼя, нік, аватар, опис, рівень, XP, кількість тестів і
        середню точність. Пошту, групи, домашні завдання й окремі відповіді там не видно.
      </p>

      <div className="mt-6">
        <Checkbox
          label="Показувати мій профіль усім"
          checked={enabled}
          disabled={setEnabled.isPending}
          onChange={(event) =>
            setEnabled.mutate(event.target.checked, {
              onSuccess: (_, next) =>
                toast.success(next ? 'Профіль знову видно за посиланням.' : 'Профіль приховано.'),
              onError: (error) =>
                toast.error(isApiError(error) ? error.message : 'Не вдалося змінити налаштування.'),
            })
          }
        />
      </div>
      {!enabled && (
        <p className="text-text-muted mt-3 max-w-xl text-sm">
          Зараз за посиланням показується «профіль недоступний» — так само, як для ніка, якого немає.
        </p>
      )}
    </section>
  );
}
