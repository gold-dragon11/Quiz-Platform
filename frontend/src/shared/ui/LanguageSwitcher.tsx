import { useTranslation } from '@/shared/i18n';
import type { UiLanguage } from '@/stores/language-store';

interface LanguageSwitcherProps {
  className?: string;
}

const OPTIONS: {
  value: UiLanguage;
  shortKey: 'lang.uk' | 'lang.en';
  fullKey: 'lang.uk.full' | 'lang.en.full';
}[] = [
  { value: 'uk', shortKey: 'lang.uk', fullKey: 'lang.uk.full' },
  { value: 'en', shortKey: 'lang.en', fullKey: 'lang.en.full' },
];

/**
 * Two-segment interface language toggle (УКР / ENG). A radio group rather than
 * a dropdown: there are only two values, so the current one and the
 * alternative should both be visible at a glance.
 */
export function LanguageSwitcher({ className = '' }: LanguageSwitcherProps): React.JSX.Element {
  const { t, language, setLanguage } = useTranslation();

  return (
    <div
      role="radiogroup"
      aria-label={t('lang.label')}
      className={`border-border bg-surface/80 inline-flex items-center gap-0.5 rounded-full border p-0.5 backdrop-blur-sm ${className}`}
    >
      {OPTIONS.map((option) => {
        const isActive = language === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            aria-label={t(option.fullKey)}
            onClick={() => setLanguage(option.value)}
            className={`focus-visible:ring-primary/60 rounded-full px-3 py-1 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none ${
              isActive
                ? 'bg-primary text-white'
                : 'text-text-muted hover:text-text-primary hover:bg-surface-elevated'
            }`}
          >
            {t(option.shortKey)}
          </button>
        );
      })}
    </div>
  );
}
