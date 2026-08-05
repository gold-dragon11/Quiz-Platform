import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useSearchParams } from 'react-router-dom';
import { ROUTES } from '@/shared/constants/routes';
import { useTranslation } from '@/shared/i18n';
import { Alert } from '@/shared/ui/Alert';
import { Button } from '@/shared/ui/Button';
import { PasswordInput } from '@/shared/ui/PasswordInput';
import { AuthCard } from '@/features/auth/components/AuthCard';
import { useResetPassword } from '@/features/auth/hooks/use-auth-mutations';
import { resetPasswordSchema, type ResetPasswordFormValues } from '@/features/auth/validation/auth.schemas';
import { applyApiErrorToForm } from '@/shared/utils/apply-api-error';

/**
 * `/reset-password?token=…` (guest-only). Sets a new password with the token
 * from the emailed link (docs/04-api/authentication.md §10). A missing token
 * short-circuits to an invalid-link state. Every token failure returns the
 * same generic 400 ("Invalid or expired reset token."), which we surface as a
 * form-level error with a path back to requesting a fresh link. The new
 * password must satisfy the registration policy (§12).
 */
export function ResetPasswordPage(): React.JSX.Element {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const resetPassword = useResetPassword();
  const { t } = useTranslation();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitSuccessful },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  const onSubmit = handleSubmit((values) => {
    if (!token) {
      return;
    }
    resetPassword.mutate(
      { token, newPassword: values.newPassword },
      {
        // Map the password-policy messages onto the password field; the
        // generic token error falls through to a form-level error.
        onError: (error) => applyApiErrorToForm(error, setError, { password: 'newPassword' }),
      },
    );
  });

  if (!token) {
    return (
      <AuthCard
        title={t('auth.reset.invalid.title')}
        footer={
          <Link to={ROUTES.forgotPassword} className="text-primary hover:text-primary-hover">
            {t('auth.reset.invalid.request')}
          </Link>
        }
      >
        <Alert variant="error">{t('auth.reset.invalid.alert')}</Alert>
      </AuthCard>
    );
  }

  if (resetPassword.isSuccess && isSubmitSuccessful) {
    return (
      <AuthCard
        title={t('auth.reset.done.title')}
        footer={
          <Link to={ROUTES.login} className="text-primary hover:text-primary-hover">
            {t('auth.forgot.backToLogin')}
          </Link>
        }
      >
        <Alert variant="success">{t('auth.reset.done.alert')}</Alert>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title={t('auth.reset.title')}
      subtitle={t('auth.reset.subtitle')}
      footer={
        <Link to={ROUTES.login} className="text-primary hover:text-primary-hover">
          {t('auth.forgot.backToLogin')}
        </Link>
      }
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {errors.root && <Alert variant="error">{errors.root.message}</Alert>}
        <PasswordInput
          label={t('auth.reset.newPassword')}
          autoComplete="new-password"
          helperText={t('auth.field.passwordHint')}
          error={errors.newPassword?.message}
          {...register('newPassword')}
        />
        <PasswordInput
          label={t('auth.reset.confirmPassword')}
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />
        <Button type="submit" fullWidth isLoading={resetPassword.isPending}>
          {t('auth.reset.submit')}
        </Button>
      </form>
    </AuthCard>
  );
}
