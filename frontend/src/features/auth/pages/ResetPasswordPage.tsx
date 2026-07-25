import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useSearchParams } from 'react-router-dom';
import { ROUTES } from '@/shared/constants/routes';
import { Alert } from '@/shared/ui/Alert';
import { Button } from '@/shared/ui/Button';
import { PasswordInput } from '@/shared/ui/PasswordInput';
import { AuthCard } from '@/features/auth/components/AuthCard';
import { useResetPassword } from '@/features/auth/hooks/use-auth-mutations';
import { resetPasswordSchema, type ResetPasswordFormValues } from '@/features/auth/validation/auth.schemas';
import { applyApiErrorToForm } from '@/features/auth/lib/apply-api-error';

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
        title="Invalid reset link"
        footer={
          <Link to={ROUTES.forgotPassword} className="text-primary hover:text-primary-hover">
            Request a new reset link
          </Link>
        }
      >
        <Alert variant="error">
          This password reset link is missing its token or is malformed. Please request a new one.
        </Alert>
      </AuthCard>
    );
  }

  if (resetPassword.isSuccess && isSubmitSuccessful) {
    return (
      <AuthCard
        title="Password updated"
        footer={
          <Link to={ROUTES.login} className="text-primary hover:text-primary-hover">
            Back to sign in
          </Link>
        }
      >
        <Alert variant="success">
          Your password has been changed and all existing sessions were signed out. Sign in with your new
          password.
        </Alert>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Set a new password"
      subtitle="Choose a strong password you don't use elsewhere."
      footer={
        <Link to={ROUTES.login} className="text-primary hover:text-primary-hover">
          Back to sign in
        </Link>
      }
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {errors.root && <Alert variant="error">{errors.root.message}</Alert>}
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
        <Button type="submit" fullWidth isLoading={resetPassword.isPending}>
          Update password
        </Button>
      </form>
    </AuthCard>
  );
}
