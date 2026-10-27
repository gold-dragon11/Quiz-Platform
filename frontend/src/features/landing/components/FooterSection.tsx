import { Link } from 'react-router-dom';
import { demoLoginPath } from '@/shared/constants/demo';
import { ROUTES } from '@/shared/constants/routes';
import { SECTION_CONTAINER } from '@/features/landing/constants';

const REPOSITORY = 'https://github.com/gold-dragon11/Quiz-Platform';

const COLUMNS: { title: string; links: { label: string; to: string; external?: boolean }[] }[] = [
  {
    title: 'Учням',
    links: [
      { label: 'Зареєструватися', to: ROUTES.register },
      { label: 'Увійти', to: ROUTES.login },
      { label: 'Демо учня', to: demoLoginPath('student') },
    ],
  },
  {
    title: 'Репетиторам',
    links: [
      { label: 'Акаунт вчителя', to: `${ROUTES.register}?as=teacher` },
      { label: 'Демо вчителя', to: demoLoginPath('teacher') },
    ],
  },
  {
    title: 'Проєкт',
    links: [{ label: 'Код на GitHub', to: REPOSITORY, external: true }],
  },
];

/**
 * Index columns: the wordmark and the three words, then where each kind of
 * visitor goes. The repository is here because the project is open, and a
 * reader who wants to know how it is built should not have to search for it.
 */
export function FooterSection(): React.JSX.Element {
  const year = new Date().getFullYear();

  return (
    <footer className="border-rule-ink border-t-2">
      <div
        className={`${SECTION_CONTAINER} grid gap-10 py-16 sm:grid-cols-2 min-[60rem]:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))]`}
      >
        <div>
          <p className="font-display text-text-primary text-[28px] leading-none">L&amp;S</p>
          <p className="text-text-secondary mt-4">Вчись. Прогресуй. Повторюй.</p>
        </div>
        {COLUMNS.map((column) => (
          <nav key={column.title} aria-label={column.title}>
            <p className="label">{column.title}</p>
            <ul className="mt-4 flex flex-col gap-3">
              {column.links.map((link) => (
                <li key={link.label}>
                  {link.external ? (
                    <a
                      href={link.to}
                      target="_blank"
                      rel="noreferrer"
                      className="text-text-primary hover:text-primary transition-colors"
                    >
                      {link.label}
                    </a>
                  ) : (
                    <Link to={link.to} className="text-text-primary hover:text-primary transition-colors">
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className={SECTION_CONTAINER}>
        <p className="label border-border border-t py-6">© {year} L&amp;S</p>
      </div>
    </footer>
  );
}
