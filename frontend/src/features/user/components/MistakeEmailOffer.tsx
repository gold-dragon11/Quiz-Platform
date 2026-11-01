import { useCurrentUser } from '@/shared/hooks/use-current-user';
import { isApiError } from '@/shared/utils/apply-api-error';
import { toast } from '@/stores/toast-store';
import { useEmailSettings, useUpdateEmailSettings } from '@/features/user/hooks/use-email-settings';

/**
 * One line under «Що далі» on a result with mistakes on the ladder: the
 * moment a reminder means something, offered once, switched on in one click.
 *
 * The email is off by default (decision 48), and a switch that lives only in
 * settings is a switch nobody finds. Here the learner has just been told their
 * mistakes come back tomorrow; asking whether to be told then is the natural
 * next sentence. Says nothing when the email is already on, for the demo, or
 * while the setting is loading.
 */
export function MistakeEmailOffer(): React.JSX.Element | null {
  const { data: user } = useCurrentUser();
  const allowed = Boolean(user && !user.isDemo);
  const settings = useEmailSettings(allowed);
  const update = useUpdateEmailSettings();

  if (!allowed || !settings.data) {
    return null;
  }

  // Shown on, after the click, so the reader sees it worked and how to undo it.
  if (settings.data.mistakeEmailsEnabled) {
    return update.isSuccess ? (
      <p className="text-text-muted mt-3 text-sm" role="status">
        Готово: о 16:00 прийде лист, якщо помилки чекатимуть, а ви ще не займалися. Вимкнути можна в
        налаштуваннях або за посиланням у листі.
      </p>
    ) : null;
  }

  return (
    <p className="text-text-muted mt-3 text-sm">
      Нагадати листом, коли вони чекатимуть?{' '}
      <button
        type="button"
        disabled={update.isPending}
        onClick={() =>
          update.mutate(
            { mistakeEmailsEnabled: true },
            { onError: (error) => toast.error(isApiError(error) ? error.message : 'Не вдалося увімкнути.') },
          )
        }
        className="text-text-primary hover:text-primary active:text-primary focus-visible:ring-focus rounded-sm underline underline-offset-4 outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        Так, о 16:00
      </button>
    </p>
  );
}
