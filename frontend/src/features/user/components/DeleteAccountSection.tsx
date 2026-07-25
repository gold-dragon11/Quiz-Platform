import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { clearSession } from '@/lib/api-client';
import { ROUTES } from '@/shared/constants/routes';
import { toast } from '@/stores/toast-store';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
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
        toast.success('Your account has been deleted.');
        navigate(ROUTES.login, { replace: true });
      },
      onError: (error) => {
        setDialogOpen(false);
        toast.error(isApiError(error) ? error.message : 'Could not delete your account. Please try again.');
      },
    });
  };

  return (
    <Card className="border-error/40">
      <div className="mb-4 flex flex-col gap-1">
        <h2 className="text-error text-lg font-semibold">Danger zone</h2>
        <p className="text-text-secondary text-sm">
          Deleting your account is permanent and cannot be undone. Your email and username stay permanently
          reserved and cannot be reused. Your learning history is retained but you will lose access to it.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <Checkbox
          label="I understand this action is permanent and cannot be undone."
          checked={acknowledged}
          onChange={(event) => setAcknowledged(event.target.checked)}
        />
        <div className="flex justify-end">
          <Button variant="danger" disabled={!acknowledged} onClick={() => setDialogOpen(true)}>
            Delete my account
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={dialogOpen}
        title="Delete your account?"
        description="This permanently deactivates your account and signs you out on every device. This cannot be undone."
        confirmLabel="Delete account"
        cancelLabel="Cancel"
        confirmVariant="danger"
        isLoading={deleteAccount.isPending}
        onConfirm={handleConfirm}
        onCancel={() => {
          if (!deleteAccount.isPending) {
            setDialogOpen(false);
          }
        }}
      />
    </Card>
  );
}
