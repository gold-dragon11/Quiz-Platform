import { useEffect } from 'react';
import type { PropsWithChildren } from 'react';
import { useLanguageStore } from '@/stores/language-store';

/**
 * Keeps `<html lang>` in sync with the interface language, mirroring how
 * ThemeProvider applies `data-theme`. Screen readers and browser translation
 * both rely on this attribute, so it has to follow the switcher rather than
 * stay at the value baked into index.html.
 */
export function LanguageProvider({ children }: PropsWithChildren): React.JSX.Element {
  const language = useLanguageStore((state) => state.language);

  useEffect(() => {
    document.documentElement.setAttribute('lang', language);
  }, [language]);

  return <>{children}</>;
}
