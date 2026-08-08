import { Link } from 'react-router-dom';
import { ROUTES } from '@/shared/constants/routes';
import { AuthCard } from '@/features/auth/components/AuthCard';
import { ResendVerificationForm } from '@/features/auth/components/ResendVerificationForm';

/**
 * The resend-verification screen (docs/04-api/authentication.md §5). Reached
 * via the `/verify-email` route when no token is present (e.g. the "Resend
 * verification" link from the login page) — the platform has no separate
 * `/resend-verification` route, so verification lives entirely under
 * `/verify-email`.
 */
export function ResendVerificationPage(): React.JSX.Element {
  return (
    <AuthCard
      title="Підтвердження пошти"
      subtitle="Введіть свою адресу, щоб отримати нове посилання для підтвердження."
      footer={
        <p>
          Уже підтвердили?{' '}
          <Link to={ROUTES.login} className="text-primary hover:text-primary-hover">
            Увійти
          </Link>
        </p>
      }
    >
      <ResendVerificationForm />
    </AuthCard>
  );
}
