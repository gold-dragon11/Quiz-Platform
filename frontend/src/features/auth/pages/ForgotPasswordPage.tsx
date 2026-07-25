import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { ROUTES } from '@/shared/constants/routes';
import { Alert } from '@/shared/ui/Alert';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { AuthCard } from '@/features/auth/components/AuthCard';
import { useForgotPassword } from '@/features/auth/hooks/use-auth-mutations';
import { forgotPasswordSchema, type ForgotPasswordFormValues } from '@/features/auth/validation/auth.schemas';
import { applyApiErrorToForm } from '@/features/auth/lib/apply-api-error';

/**
 * `/forgot-password` (guest-only). Requests a reset email
 * (docs/04-api/authentication.md §9). The backend always responds 202 and
 * never reveals whether the address exists, so on success we show a neutral
 * confirmation that does not confirm or deny the account.
 */
export function ForgotPasswordPage(): React.JSX.Element {
  const forgotPassword = useForgotPassword();
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = handleSubmit((values) => {
    forgotPassword.mutate(values, {
      onSuccess: () => setSubmittedEmail(values.email),
      onError: (error) => applyApiErrorToForm(error, setError),
    });
  });

  const footer = (
    <p>
      Remembered it?{' '}
      <Link to={ROUTES.login} className="text-primary hover:text-primary-hover">
        Back to sign in
      </Link>
    </p>
  );

  if (submittedEmail) {
    return (
      <AuthCard title="Check your email" footer={footer}>
        <Alert variant="success">
          If an account exists for {submittedEmail}, we&apos;ve sent a link to reset your password. The link
          expires after a while, so use it soon.
        </Alert>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Forgot your password?" subtitle="We'll email you a link to reset it." footer={footer}>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {errors.root && <Alert variant="error">{errors.root.message}</Alert>}
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          error={errors.email?.message}
          {...register('email')}
        />
        <Button type="submit" fullWidth isLoading={forgotPassword.isPending}>
          Send reset link
        </Button>
      </form>
    </AuthCard>
  );
}
