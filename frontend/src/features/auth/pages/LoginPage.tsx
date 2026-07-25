import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ROUTES } from '@/shared/constants/routes';
import { toast } from '@/stores/toast-store';
import { Alert } from '@/shared/ui/Alert';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { PasswordInput } from '@/shared/ui/PasswordInput';
import { AuthCard } from '@/features/auth/components/AuthCard';
import { useLogin } from '@/features/auth/hooks/use-auth-mutations';
import { loginSchema, type LoginFormValues } from '@/features/auth/validation/auth.schemas';
import { applyApiErrorToForm } from '@/features/auth/lib/apply-api-error';

interface FromState {
  from?: { pathname?: string };
}

/**
 * `/login` (guest-only). Authenticates via the app auth service; on success
 * returns the user to wherever RequireAuth bounced them from, or the
 * dashboard. Login-specific backend outcomes (401 invalid credentials, 403
 * unverified/suspended) surface as a form-level error and a toast, exactly as
 * the backend returns them (docs/04-api/authentication.md §6).
 */
export function LoginPage(): React.JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useLogin();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const redirectTo = (location.state as FromState | null)?.from?.pathname ?? ROUTES.dashboard;

  const onSubmit = handleSubmit((values) => {
    login.mutate(values, {
      onSuccess: () => {
        toast.success('Welcome back!');
        navigate(redirectTo, { replace: true });
      },
      onError: (error) => applyApiErrorToForm(error, setError),
    });
  });

  return (
    <AuthCard
      title="Sign in"
      subtitle="Welcome back to Quiz Platform"
      footer={
        <div className="flex flex-col gap-2">
          <p>
            Don&apos;t have an account?{' '}
            <Link to={ROUTES.register} className="text-primary hover:text-primary-hover">
              Create one
            </Link>
          </p>
          <p>
            Haven&apos;t verified your email?{' '}
            <Link to={ROUTES.verifyEmail} className="text-primary hover:text-primary-hover">
              Resend verification
            </Link>
          </p>
        </div>
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
        <PasswordInput
          label="Password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />
        <div className="flex justify-end">
          <Link to={ROUTES.forgotPassword} className="text-text-muted hover:text-text-secondary text-sm">
            Forgot password?
          </Link>
        </div>
        <Button type="submit" fullWidth isLoading={login.isPending}>
          Sign in
        </Button>
      </form>
    </AuthCard>
  );
}
