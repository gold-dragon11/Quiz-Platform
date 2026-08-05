import { useCallback } from 'react';
import { useLanguageStore, type UiLanguage } from '@/stores/language-store';
import { uk, type TranslationKey } from './dictionaries/uk';
import { en } from './dictionaries/en';

const DICTIONARIES: Record<UiLanguage, Record<TranslationKey, string>> = { uk, en };

/** Values substituted into `{placeholder}` slots. */
export type TranslationVars = Record<string, string | number>;

interface Translation {
  /** Looks up `key` in the active dictionary and fills `{placeholders}`. */
  t: (key: TranslationKey, vars?: TranslationVars) => string;
  language: UiLanguage;
  setLanguage: (language: UiLanguage) => void;
}

/**
 * Interface translation (Phase 6.12). A deliberately small in-house solution
 * rather than a library: the key set is a const object, so TypeScript checks
 * both the keys used at call sites and the completeness of each dictionary.
 *
 * Only the interface is translated. Learning content (subjects, topics,
 * questions) comes from the API in the language it was authored in and is
 * never passed through here.
 */
export function useTranslation(): Translation {
  const language = useLanguageStore((state) => state.language);
  const setLanguage = useLanguageStore((state) => state.setLanguage);

  const t = useCallback(
    (key: TranslationKey, vars?: TranslationVars): string => {
      const template = DICTIONARIES[language][key];
      if (!vars) return template;
      return template.replace(/\{(\w+)\}/g, (match, name: string) =>
        name in vars ? String(vars[name]) : match,
      );
    },
    [language],
  );

  return { t, language, setLanguage };
}
