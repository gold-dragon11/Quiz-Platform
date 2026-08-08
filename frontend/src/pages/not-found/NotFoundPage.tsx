import { Link } from 'react-router-dom';
import { ROUTES } from '@/shared/constants/routes';

export function NotFoundPage(): React.JSX.Element {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <h1 className="text-3xl font-semibold">404</h1>
      <p className="text-text-muted">Таку сторінку не знайдено.</p>
      <Link to={ROUTES.home} className="text-primary hover:text-primary-hover">
        На головну
      </Link>
    </div>
  );
}
