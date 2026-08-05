import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { ROUTES } from '@/shared/constants/routes';
import { useTranslation } from '@/shared/i18n';
import { Alert } from '@/shared/ui/Alert';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { AuthCard } from '@/features/auth/components/AuthCard';
import { useForgotPassword } from '@/features/auth/hooks/use-auth-mutations';
import { forgotPasswordSchema, type ForgotPasswordFormValues } from '@/features/auth/validation/auth.schemas';
import { applyApiErrorToForm } from '@/shared/utils/apply-api-error';

/**
 * `/forgot-password` (guest-only). Requests a reset email
 * (docs/04-api/authentication.md §9). The backend always responds 202 and
 * never reveals whether the address exists, so on success we show a neutral
 * confirmation that does not confirm or deny the account.
 */
export function ForgotPasswordPage(): React.JSX.Element {
  const forgotPassword = useForgotPassword();
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const { t } = useTranslation();

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
      {t('auth.forgot.remembered')}{' '}
      <Link to={ROUTES.login} className="text-primary hover:text-primary-hover">
        {t('auth.forgot.backToLogin')}
      </Link>
    </p>
  );

  if (submittedEmail) {
    return (
      <AuthCard title={t('auth.forgot.sent.title')} footer={footer}>
        <Alert variant="success">{t('auth.forgot.sent.alert', { email: submittedEmail })}</Alert>
      </AuthCard>
    );
  }

  return (
    <AuthCard title={t('auth.forgot.title')} subtitle={t('auth.forgot.subtitle')} footer={footer}>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {errors.root && <Alert variant="error">{errors.root.message}</Alert>}
        <Input
          label={t('auth.field.email')}
          type="email"
          autoComplete="email"
          placeholder={t('auth.field.emailPlaceholder')}
          error={errors.email?.message}
          {...register('email')}
        />
        <Button type="submit" fullWidth isLoading={forgotPassword.isPending}>
          {t('auth.forgot.submit')}
        </Button>
      </form>
    </AuthCard>
  );
}
