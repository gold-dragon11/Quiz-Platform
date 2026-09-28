import { useEffect } from 'react';
import type { PropsWithChildren } from 'react';
import { applyTheme, useForcedTheme } from '@/shared/hooks/use-theme';
import { lightMediaQuery, resolveTheme, useThemeStore } from '@/stores/theme-store';

/**
 * Applies the resolved theme to the document root as `data-theme` (Phase 6.1
 * decisions F6/F11, constraint 5).
 *
 * index.html settles the same attribute before the first paint, so this is
 * not what stops the theme flashing — it is what keeps the document in step
 * once the reader changes their mind, and what follows the OS while the
 * preference is `system`.
 *
 * A screen may pin its own theme regardless of the preference — the landing
 * page does — through `useForcedTheme`; the store it reads is consulted here
 * so that both writers are this one effect rather than two racing ones.
 */
export function ThemeProvider({ children }: PropsWithChildren): React.JSX.Element {
  const preference = useThemeStore((state) => state.preference);
  const forced = useForcedTheme();

  useEffect(() => {
    if (forced) {
      applyTheme(forced);
      return;
    }

    applyTheme(resolveTheme(preference));

    if (preference !== 'system') {
      return;
    }

    // `system` is not a value but a subscription: the OS setting can change
    // under an open tab, and a reader who asked to follow it means now, not
    // at the next reload.
    const query = lightMediaQuery();
    const follow = (): void => applyTheme(resolveTheme('system'));
    query?.addEventListener('change', follow);
    return () => query?.removeEventListener('change', follow);
  }, [preference, forced]);

  return <>{children}</>;
}
