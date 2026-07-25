import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { ROUTES } from '@/shared/constants/routes';
import { toast } from '@/stores/toast-store';
import { Language } from '@/shared/types/enums';
import { Alert } from '@/shared/ui/Alert';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { PasswordInput } from '@/shared/ui/PasswordInput';
import { Select } from '@/shared/ui/Select';
import { AuthCard } from '@/features/auth/components/AuthCard';
import { useRegister, useResendVerification } from '@/features/auth/hooks/use-auth-mutations';
import { registerSchema, type RegisterFormValues } from '@/features/auth/validation/auth.schemas';
import { applyApiErrorToForm } from '@/features/auth/lib/apply-api-error';

const LANGUAGE_OPTIONS = [
  { value: Language.ENGLISH, label: 'English' },
  { value: Language.UKRAINIAN, label: 'Ukrainian' },
];

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
        title="Check your email"
        subtitle={`We've sent a verification link to ${registeredEmail}.`}
        footer={
          <p>
            Ready to sign in?{' '}
            <Link to={ROUTES.login} className="text-primary hover:text-primary-hover">
              Go to sign in
            </Link>
          </p>
        }
      >
        <div className="flex flex-col gap-4">
          <Alert variant="success">
            Your account has been created. Click the link in the email to verify your address, then sign in.
          </Alert>
          <Button
            variant="secondary"
            fullWidth
            isLoading={resend.isPending}
            onClick={() =>
              resend.mutate(
                { email: registeredEmail },
                {
                  onSuccess: () =>
                    toast.success('If the address still needs verifying, a new link is on its way.'),
                  onError: () => toast.error('Could not resend right now. Please try again.'),
                },
              )
            }
          >
            Resend verification email
          </Button>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Create your account"
      subtitle="Start learning with Quiz Platform"
      footer={
        <p>
          Already have an account?{' '}
          <Link to={ROUTES.login} className="text-primary hover:text-primary-hover">
            Sign in
          </Link>
        </p>
      }
    >
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
        <Input
          label="Username"
          autoComplete="username"
          placeholder="your_username"
          helperText="3–30 characters: letters, numbers, and underscores."
          error={errors.username?.message}
          {...register('username')}
        />
        <PasswordInput
          label="Password"
          autoComplete="new-password"
          helperText="At least 8 characters with upper, lower, a number, and a symbol."
          error={errors.password?.message}
          {...register('password')}
        />
        <PasswordInput
          label="Confirm password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />
        <Select
          label="Preferred language"
          options={LANGUAGE_OPTIONS}
          error={errors.preferredLanguage?.message}
          {...register('preferredLanguage')}
        />
        <Button type="submit" fullWidth isLoading={registerMutation.isPending}>
          Create account
        </Button>
      </form>
    </AuthCard>
  );
}
