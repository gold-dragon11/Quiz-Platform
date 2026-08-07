import { Link } from 'react-router-dom';
import { ROUTES } from '@/shared/constants/routes';
import { useTranslation } from '@/shared/i18n';
import { Logo } from '@/features/landing/components/Logo';
import { SECTION_CONTAINER } from '@/features/landing/constants';

/** Footer (§7): logo, navigation, and copyright. */
export function FooterSection(): React.JSX.Element {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  return (
    <footer className="border-border border-t">
      <div
        className={`${SECTION_CONTAINER} flex flex-col gap-6 py-14 sm:flex-row sm:items-center sm:justify-between`}
      >
        <div className="flex flex-col gap-2">
          <Logo />
          <p className="text-text-muted text-base">{t('landing.footer.tagline')}</p>
        </div>

        <nav className="flex flex-wrap items-center gap-x-8 gap-y-2 text-base">
          <Link to={ROUTES.login} className="text-text-muted hover:text-text-primary">
            {t('landing.footer.login')}
          </Link>
          <Link to={ROUTES.register} className="text-text-muted hover:text-text-primary">
            {t('landing.footer.register')}
          </Link>
        </nav>
      </div>
      <div className="border-border border-t">
        <p className={`${SECTION_CONTAINER} text-text-muted py-5 text-sm`}>
          {t('landing.footer.rights', { year })}
        </p>
      </div>
    </footer>
  );
}
