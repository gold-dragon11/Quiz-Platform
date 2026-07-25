import { useEffect } from 'react';
import type { PropsWithChildren } from 'react';
import { resolveTheme, useThemeStore } from '@/stores/theme-store';

/**
 * Applies the resolved theme to the document root as `data-theme` (Phase 6.1
 * decisions F6/F11, constraint 5). Future-proof: adding `light`/`system`
 * needs only new token overrides in globals.css and the store enum — no
 * change here. The MVP always resolves to dark.
 */
export function ThemeProvider({ children }: PropsWithChildren): React.JSX.Element {
  const preference = useThemeStore((state) => state.preference);

  useEffect(() => {
    const resolved = resolveTheme(preference);
    document.documentElement.setAttribute('data-theme', resolved);
  }, [preference]);

  return <>{children}</>;
}
