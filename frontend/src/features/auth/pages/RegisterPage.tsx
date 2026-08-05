import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { ROUTES } from '@/shared/constants/routes';
import { toast } from '@/stores/toast-store';
import { Language } from '@/shared/types/enums';
import { useTranslation } from '@/shared/i18n';
import { Alert } from '@/shared/ui/Alert';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { PasswordInput } from '@/shared/ui/PasswordInput';
import { Select } from '@/shared/ui/Select';
import { AuthCard } from '@/features/auth/components/AuthCard';
import { useRegister, useResendVerification } from '@/features/auth/hooks/use-auth-mutations';
import { registerSchema, type RegisterFormValues } from '@/features/auth/validation/auth.schemas';
import { applyApiErrorToForm } from '@/shared/utils/apply-api-error';

/**
 * `/register` (guest-only). Creates an account (docs/04-api/authentication.md
 * §4), then shows a "check your email" confirmation — registration does not
 * establish a session; the account is Pending Verification until the emailed
 * link is used. 409 conflicts (email/username taken) and 400 validation errors
 * are surfaced inline on the offending field.
 */
export function RegisterPage(): React.JSX.Element {
  const registerMutation = useRegister();
  const resend = useResendVerification();
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
  const { t } = useTranslation();

  // The account's preferred language is a backend field (ENGLISH/UKRAINIAN),
  // separate from the interface language chosen with the switcher.
  const languageOptions = [
    { value: Language.ENGLISH, label: t('auth.language.english') },
    { value: Language.UKRAINIAN, label: t('auth.language.ukrainian') },
  ];

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      username: '',
      password: '',
      confirmPassword: '',
      preferredLanguage: Language.ENGLISH,
    },
  });

  const onSubmit = handleSubmit((values) => {
    registerMutation.mutate(
      {
        email: values.email,
        username: values.username,
        password: values.password,
        preferredLanguage: values.preferredLanguage,
      },
      {
        onSuccess: () => setRegisteredEmail(values.email),
        onError: (error) =>
          applyApiErrorToForm(error, setError, {
            email: 'email',
            username: 'username',
            password: 'password',
          }),
      },
    );
  });

  if (registeredEmail) {
    return (
      <AuthCard
        title={t('auth.register.checkEmail.title')}
        subtitle={t('auth.register.checkEmail.subtitle', { email: registeredEmail })}
        footer={
          <p>
            {t('auth.register.checkEmail.ready')}{' '}
            <Link to={ROUTES.login} className="text-primary hover:text-primary-hover">
              {t('auth.register.checkEmail.goToLogin')}
            </Link>
          </p>
        }
      >
        <div className="flex flex-col gap-4">
          <Alert variant="success">{t('auth.register.checkEmail.alert')}</Alert>
          <Button
            variant="secondary"
            fullWidth
            isLoading={resend.isPending}
            onClick={() =>
              resend.mutate(
                { email: registeredEmail },
                {
                  onSuccess: () => toast.success(t('auth.register.resendSuccess')),
                  onError: () => toast.error(t('auth.register.resendError')),
                },
              )
            }
          >
            {t('auth.register.checkEmail.resend')}
          </Button>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title={t('auth.register.title')}
      subtitle={t('auth.register.subtitle')}
      footer={
        <p>
          {t('auth.register.hasAccount')}{' '}
          <Link to={ROUTES.login} className="text-primary hover:text-primary-hover">
            {t('auth.register.signIn')}
          </Link>
        </p>
      }
    >
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
        <Input
          label={t('auth.field.username')}
          autoComplete="username"
          placeholder={t('auth.field.usernamePlaceholder')}
          helperText={t('auth.field.usernameHint')}
          error={errors.username?.message}
          {...register('username')}
        />
        <PasswordInput
          label={t('auth.field.password')}
          autoComplete="new-password"
          helperText={t('auth.field.passwordHint')}
          error={errors.password?.message}
          {...register('password')}
        />
        <PasswordInput
          label={t('auth.field.confirmPassword')}
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />
        <Select
          label={t('auth.field.preferredLanguage')}
          options={languageOptions}
          error={errors.preferredLanguage?.message}
          {...register('preferredLanguage')}
        />
        <Button type="submit" fullWidth isLoading={registerMutation.isPending}>
          {t('auth.register.submit')}
        </Button>
      </form>
    </AuthCard>
  );
}
