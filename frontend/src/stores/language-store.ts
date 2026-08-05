import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Interface language preference. Client UI state (Zustand), persisted across
 * sessions like the theme preference — it is a preference, not a credential,
 * so localStorage is appropriate (docs/05-frontend/state-management.md §12/§15).
 *
 * Deliberately distinct from the backend `Language` enum in shared/types/enums,
 * which is the account's `preferredLanguage` (ENGLISH/UKRAINIAN) sent to the
 * API. This one only drives which dictionary the UI renders, and works for
 * signed-out visitors too.
 */
export type UiLanguage = 'uk' | 'en';

interface LanguageState {
  language: UiLanguage;
  setLanguage: (language: UiLanguage) => void;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      // The platform targets Ukrainian NMT/ZNO students, so Ukrainian is the
      // default for a first-time visitor.
      language: 'uk',
      setLanguage: (language) => set({ language }),
    }),
    { name: 'quix.language' },
  ),
);
