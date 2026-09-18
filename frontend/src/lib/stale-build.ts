/**
 * A tab opened before a deploy, asking for a page of the build it came with.
 *
 * Every page is its own file, named by the hash of its content. After a
 * deploy the old names are gone, so a tab left open across it fails the
 * moment it opens a page it has not loaded yet — «Failed to fetch dynamically
 * imported module». Nothing is broken but the tab: loading the page again
 * picks up the new build. So that is what happens, once, instead of an error
 * screen and a report about a bug that does not exist.
 *
 * Once: if the fresh page fails the same way within half a minute, the files
 * really are missing, and the error is shown and reported as usual.
 */

const RELOADED_AT_KEY = 'quix.staleBuildReloadAt';
const GUARD_MS = 30_000;

/** How each browser words a failed import of a page's file. */
const STALE_BUILD_MESSAGES = [
  /Failed to fetch dynamically imported module/i, // Chrome, Edge
  /error loading dynamically imported module/i, // Firefox
  /Importing a module script failed/i, // Safari
  /Unable to preload CSS/i, // Vite, a page's stylesheet
];

export function isStaleBuildError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  return STALE_BUILD_MESSAGES.some((pattern) => pattern.test(message));
}

/** Reloads the page unless it already did so moments ago; says whether it did. */
export function reloadForNewBuild(): boolean {
  try {
    const last = Number(sessionStorage.getItem(RELOADED_AT_KEY) ?? 0);
    if (Date.now() - last < GUARD_MS) {
      return false;
    }
    sessionStorage.setItem(RELOADED_AT_KEY, String(Date.now()));
  } catch {
    // No storage (a locked-down browser): no guard, so no reload either —
    // a loop would be worse than the error screen.
    return false;
  }
  window.location.reload();
  return true;
}

/**
 * Vite announces a failed page import before it becomes an error; handled
 * here, most stale tabs reload without ever reaching the error screen.
 */
export function installStaleBuildRecovery(): void {
  window.addEventListener('vite:preloadError', (event) => {
    if (reloadForNewBuild()) {
      event.preventDefault();
    }
  });
}
