import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { clearSession } from '@/lib/api-client';
import { ROUTES } from '@/shared/constants/routes';
import { toast } from '@/stores/toast-store';
import { Button } from '@/shared/ui/Button';
import { Checkbox } from '@/shared/ui/Checkbox';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { isApiError } from '@/shared/utils/apply-api-error';
import { useDeleteAccount } from '@/features/user/hooks/use-account-mutations';

/**
 * Danger-zone account deletion (docs/04-api/users.md §7). Two-step intent: an
 * explicit acknowledgement checkbox gates the button, and a confirmation
 * dialog gates the request. On success the backend soft-deletes the account
 * and revokes all sessions; the client then tears down local auth + the query
 * cache and redirects to /login.
 */
export function DeleteAccountSection(): React.JSX.Element {
  const [acknowledged, setAcknowledged] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const deleteAccount = useDeleteAccount();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const handleConfirm = (): void => {
    deleteAccount.mutate(undefined, {
      onSuccess: () => {
        // Order matters: drop the session first, then the cached server data,
        // then leave the authenticated area.
        clearSession();
        queryClient.clear();
        setDialogOpen(false);
        toast.success('Ваш акаунт видалено.');
        navigate(ROUTES.login, { replace: true });
      },
      onError: (error) => {
        setDialogOpen(false);
        toast.error(isApiError(error) ? error.message : 'Не вдалося видалити акаунт. Спробуйте ще раз.');
      },
    });
  };

  return (
    <section>
      <h2 className="text-error text-xs tracking-[0.18em] uppercase">Видалення акаунта</h2>
      <p className="text-text-secondary mt-4 max-w-xl text-sm">
        Дію не можна скасувати. Ваша електронна адреса та імʼя користувача лишаються зарезервованими назавжди
        — зареєструватися з ними знову не вийде. Історія навчання зберігається, але доступу до неї у вас
        більше не буде.
      </p>

      <div className="border-error/40 mt-8 flex flex-col gap-5 border-t pt-8">
        <Checkbox
          label="Я розумію, що цю дію не можна скасувати."
          checked={acknowledged}
          onChange={(event) => setAcknowledged(event.target.checked)}
        />
        <div>
          <Button variant="danger" disabled={!acknowledged} onClick={() => setDialogOpen(true)}>
            Видалити мій акаунт
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={dialogOpen}
        title="Видалити акаунт?"
        description="Акаунт буде остаточно деактивовано, а сеанси на всіх пристроях завершено. Скасувати це неможливо."
        confirmLabel="Видалити акаунт"
        cancelLabel="Скасувати"
        confirmVariant="danger"
        isLoading={deleteAccount.isPending}
        onConfirm={handleConfirm}
        onCancel={() => {
          if (!deleteAccount.isPending) {
            setDialogOpen(false);
          }
        }}
      />
    </section>
  );
}
