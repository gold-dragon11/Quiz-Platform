import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from '@/stores/toast-store';
import { Alert } from '@/shared/ui/Alert';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { PasswordInput } from '@/shared/ui/PasswordInput';
import { applyApiErrorToForm } from '@/shared/utils/apply-api-error';
import { useChangePassword } from '@/features/user/hooks/use-account-mutations';
import { changePasswordSchema, type ChangePasswordFormValues } from '@/features/user/validation/user.schemas';

/**
 * Change-password section (docs/04-api/users.md §6). On success the backend
 * revokes every refresh session in the same transaction — we deliberately do
 * NOT sign the user out here; the current access token keeps working until it
 * expires, and any later refresh failure is handled by the shared Axios layer.
 *
 * Backend errors are shown exactly as returned: policy messages map to the new
 * password field, "Current password is incorrect." to the current field, and
 * anything else surfaces as a form-level error.
 */
export function ChangePasswordForm(): React.JSX.Element {
  const changePassword = useChangePassword();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const onSubmit = handleSubmit((values) => {
    changePassword.mutate(
      {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      },
      {
        onSuccess: () => {
          toast.success('Your password has been changed.');
          reset();
        },
        onError: (error) =>
          applyApiErrorToForm(error, setError, {
            'current password': 'currentPassword',
            'new password': 'newPassword',
            password: 'newPassword',
          }),
      },
    );
  });

  return (
    <Card>
      <div className="mb-4 flex flex-col gap-1">
        <h2 className="text-text-primary text-lg font-semibold">Change password</h2>
        <p className="text-text-muted text-sm">
          Signing you in on other devices will be required after this change.
        </p>
      </div>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {errors.root && <Alert variant="error">{errors.root.message}</Alert>}
        <PasswordInput
          label="Current password"
          autoComplete="current-password"
          error={errors.currentPassword?.message}
          {...register('currentPassword')}
        />
        <PasswordInput
          label="New password"
          autoComplete="new-password"
          helperText="At least 8 characters with upper, lower, a number, and a symbol."
          error={errors.newPassword?.message}
          {...register('newPassword')}
        />
        <PasswordInput
          label="Confirm new password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />
        <div className="flex justify-end">
          <Button type="submit" isLoading={changePassword.isPending}>
            Update password
          </Button>
        </div>
      </form>
    </Card>
  );
}
