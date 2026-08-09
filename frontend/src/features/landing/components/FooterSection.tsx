import { Logo } from '@/features/landing/components/Logo';
import { SECTION_CONTAINER } from '@/features/landing/constants';

/**
 * Footer (§7): logo, tagline, and copyright. The login/register links were
 * removed — both are already one tap away in the hero and the closing CTA.
 */
export function FooterSection(): React.JSX.Element {
  const year = new Date().getFullYear();

  return (
    <footer className="border-border border-t">
      <div className={`${SECTION_CONTAINER} flex flex-col gap-2 py-14`}>
        <Logo />
        <p className="text-text-muted text-base">Вчись Прогресуй Повторюй</p>
      </div>
      <div className="border-border border-t">
        <p className={`${SECTION_CONTAINER} text-text-muted py-5 text-sm`}>
          © {year} L&amp;S. Усі права захищено.
        </p>
      </div>
    </footer>
  );
}
