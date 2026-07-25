import { useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ROUTES } from '@/shared/constants/routes';
import { Alert } from '@/shared/ui/Alert';
import { Skeleton } from '@/shared/ui/Skeleton';
import { AuthCard } from '@/features/auth/components/AuthCard';
import { ResendVerificationForm } from '@/features/auth/components/ResendVerificationForm';
import { ResendVerificationPage } from '@/features/auth/pages/ResendVerificationPage';
import { useVerifyEmail } from '@/features/auth/hooks/use-auth-mutations';
import { isApiError } from '@/features/auth/lib/apply-api-error';

const GENERIC_VERIFY_ERROR = 'Invalid or expired verification token.';

/**
 * `/verify-email?token=…` (public). Submits the token from the emailed link on
 * mount and reports the outcome (docs/04-api/authentication.md §5). Every
 * failure returns the same generic 400, which we show verbatim alongside a
 * resend form. With no token in the URL, the route doubles as the
 * resend-verification screen.
 */
export function VerifyEmailPage(): React.JSX.Element {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const verify = useVerifyEmail();
  const attempted = useRef(false);

  useEffect(() => {
    if (token && !attempted.current) {
      attempted.current = true;
      verify.mutate({ token });
    }
  }, [token, verify]);

  // No token → this route is the resend-verification screen.
  if (!token) {
    return <ResendVerificationPage />;
  }

  if (verify.isIdle || verify.isPending) {
    return (
      <AuthCard title="Verifying your email" subtitle="This will only take a moment.">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </AuthCard>
    );
  }

  if (verify.isSuccess) {
    return (
      <AuthCard
        title="Email verified"
        footer={
          <Link to={ROUTES.login} className="text-primary hover:text-primary-hover">
            Continue to sign in
          </Link>
        }
      >
        <Alert variant="success">
          Your email address has been verified. You can now sign in to your account.
        </Alert>
      </AuthCard>
    );
  }

  const message = isApiError(verify.error) ? verify.error.message : GENERIC_VERIFY_ERROR;

  return (
    <AuthCard
      title="Verification failed"
      footer={
        <p>
          Already verified?{' '}
          <Link to={ROUTES.login} className="text-primary hover:text-primary-hover">
            Sign in
          </Link>
        </p>
      }
    >
      <div className="flex flex-col gap-4">
        <Alert variant="error">{message}</Alert>
        <p className="text-text-secondary text-sm">Request a fresh verification link:</p>
        <ResendVerificationForm submitLabel="Send new link" />
      </div>
    </AuthCard>
  );
}
