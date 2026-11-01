import { Checkbox } from '@/shared/ui/Checkbox';
import { Skeleton } from '@/shared/ui/Skeleton';
import { isApiError } from '@/shared/utils/apply-api-error';
import { toast } from '@/stores/toast-store';
import { useEmailSettings, useUpdateEmailSettings } from '@/features/user/hooks/use-email-settings';
import type { EmailSettings } from '@/features/user/types/user.types';

/**
 * Which emails arrive (decisions 25 and 48). Each switch says what the email
 * is and when it comes, because «Сповіщення» alone asks the reader to agree to
 * mail they have never seen.
 */
export function EmailSection(): React.JSX.Element {
  const settings = useEmailSettings();
  const update = useUpdateEmailSettings();

  const set = (patch: Partial<EmailSettings>, done: string): void => {
    update.mutate(patch, {
      onSuccess: () => toast.success(done),
      onError: (error) => toast.error(isApiError(error) ? error.message : 'Не вдалося змінити налаштування.'),
    });
  };

  return (
    <section>
      <h2 className="section-title border-border border-b pb-3">Листи</h2>
      <p className="text-text-secondary mt-6 max-w-xl text-sm">
        Листи про підтвердження пошти й зміну пароля приходять завжди. Решту можна вимкнути.
      </p>

      {settings.isPending ? (
        <div className="mt-6 flex flex-col gap-3">
          <Skeleton className="h-6" />
          <Skeleton className="h-6" />
        </div>
      ) : settings.isError ? (
        <p className="text-text-muted mt-6 text-sm">Не вдалося завантажити. Оновіть сторінку.</p>
      ) : (
        <div className="mt-6 flex flex-col gap-5">
          <Checkbox
            label={
              <>
                <span className="text-text-primary">Домашні завдання.</span> Коли вчитель задає роботу і за
                день до дедлайну, якщо ще не здано.
              </>
            }
            checked={settings.data.assignmentEmailsEnabled}
            disabled={update.isPending}
            onChange={(event) =>
              set(
                { assignmentEmailsEnabled: event.target.checked },
                event.target.checked ? 'Листи про домашні увімкнено.' : 'Листи про домашні вимкнено.',
              )
            }
          />
          <Checkbox
            label={
              <>
                <span className="text-text-primary">Помилки чекають.</span> О 16:00, якщо на повторення
                чекають помилки, а ви сьогодні ще не займалися. Не частіше разу на день.
              </>
            }
            checked={settings.data.mistakeEmailsEnabled}
            disabled={update.isPending}
            onChange={(event) =>
              set(
                { mistakeEmailsEnabled: event.target.checked },
                event.target.checked
                  ? 'Нагадування про помилки увімкнено.'
                  : 'Нагадування про помилки вимкнено.',
              )
            }
          />
        </div>
      )}
    </section>
  );
}
