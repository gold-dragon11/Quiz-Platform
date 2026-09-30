import { useEffect } from 'react';
import { create } from 'zustand';
import type { ResolvedTheme } from '@/stores/theme-store';

/**
 * The browser-facing half of theming: writing a resolved theme to the
 * document, and letting a single screen insist on one.
 *
 * The preference itself lives in `@/stores/theme-store`; this file never
 * decides what the theme should be, only carries the answer to the DOM.
 */

/** The address bar and task switcher on a phone, which read this meta tag. */
const BAR_COLOR: Record<ResolvedTheme, string> = {
  dark: '#0b0a0f',
  light: '#f7f6f9',
};

/**
 * Puts a theme on the document root. Kept out of the provider so the same
 * two lines serve the provider, the pre-paint script's contract, and tests.
 */
export function applyTheme(theme: ResolvedTheme): void {
  document.documentElement.setAttribute('data-theme', theme);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', BAR_COLOR[theme]);
}

interface ForcedThemeState {
  forced: ResolvedTheme | null;
  setForced: (theme: ResolvedTheme | null) => void;
}

const useForcedThemeStore = create<ForcedThemeState>()((set) => ({
  forced: null,
  setForced: (forced) => set({ forced }),
}));

/** Read by ThemeProvider, which is the only thing that writes to the document. */
export function useForcedTheme(): ResolvedTheme | null {
  return useForcedThemeStore((state) => state.forced);
}

/**
 * Pins the theme for as long as the calling screen is mounted, whatever the
 * reader's preference. The landing page uses it: it is a designed dark poster
 * — the violet strokes behind the hero, the backdrop, the mock test — and
 * none of that was drawn for a white page. The product behind the login is
 * where the preference applies.
 *
 * On leaving the screen the preference takes over again, because the pin is
 * released and ThemeProvider re-runs.
 */
export function usePinnedTheme(theme: ResolvedTheme): void {
  const setForced = useForcedThemeStore((state) => state.setForced);

  useEffect(() => {
    setForced(theme);
    return () => setForced(null);
  }, [theme, setForced]);
}
