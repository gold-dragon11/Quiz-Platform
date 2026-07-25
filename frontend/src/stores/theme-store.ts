import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Theme preference (Phase 6.1 decisions F11 + constraint 5). The MVP ships a
 * single dark theme, but the store is shaped so `light` and `system` can be
 * added later without refactoring. The preference persists across sessions
 * (docs/05-frontend/state-management.md §12/§15) — it is a UI preference, not
 * a credential, so localStorage is appropriate here (unlike tokens).
 */
export type ThemePreference = 'dark' | 'light' | 'system';

/** The concrete theme actually applied to the DOM. */
export type ResolvedTheme = 'dark' | 'light';

interface ThemeState {
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      // MVP default and only supported value.
      preference: 'dark',
      setPreference: (preference) => set({ preference }),
    }),
    { name: 'quix.theme' },
  ),
);

/**
 * Resolves a preference to a concrete theme. `system` follows the OS setting;
 * everything else is used directly. MVP always resolves to `dark`.
 */
export function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference === 'system') {
    const prefersLight =
      typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: light)').matches;
    return prefersLight ? 'light' : 'dark';
  }
  return preference;
}
