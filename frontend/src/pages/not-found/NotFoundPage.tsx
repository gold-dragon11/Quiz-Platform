import { Link } from 'react-router-dom';
import { ROUTES } from '@/constants/routes';

export function NotFoundPage(): React.JSX.Element {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <h1 className="text-3xl font-semibold">404</h1>
      <p className="text-text-muted">This page could not be found.</p>
      <Link to={ROUTES.home} className="text-primary hover:text-primary-hover">
        Return home
      </Link>
    </div>
  );
}
