import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Theme preference (Phase 6.1 decisions F11 + constraint 5). The preference
 * persists across sessions (docs/05-frontend/state-management.md §12/§15) — it
 * is a UI preference, not a credential, so localStorage is appropriate here
 * (unlike tokens).
 *
 * The key and its shape are read a second time by the inline script in
 * index.html, which settles the theme before the first paint. Changing either
 * means changing that script too.
 */
export type ThemePreference = 'dark' | 'light' | 'system';

/** The concrete theme actually applied to the DOM. */
export type ResolvedTheme = 'dark' | 'light';

/** Shared with index.html's pre-paint script. */
export const THEME_STORAGE_KEY = 'quix.theme';

/** The choices offered in settings, in the order they are shown. */
export const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'dark', label: 'Темна' },
  { value: 'light', label: 'Світла' },
  { value: 'system', label: 'Як у системі' },
];

interface ThemeState {
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      // Dark is the platform's own look; light is a deliberate choice.
      preference: 'dark',
      setPreference: (preference) => set({ preference }),
    }),
    { name: THEME_STORAGE_KEY },
  ),
);

/** The media query `system` follows, or null where there is no window. */
export function lightMediaQuery(): MediaQueryList | null {
  return typeof window === 'undefined' ? null : window.matchMedia('(prefers-color-scheme: light)');
}

/**
 * Resolves a preference to a concrete theme. `system` follows the OS setting;
 * everything else is used directly.
 */
export function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference === 'system') {
    return lightMediaQuery()?.matches ? 'light' : 'dark';
  }
  return preference;
}
