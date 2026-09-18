import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isStaleBuildError, reloadForNewBuild } from './stale-build';

describe('isStaleBuildError', () => {
  it('recognises a failed page import in each browser’s words', () => {
    for (const message of [
      'Failed to fetch dynamically imported module: https://learn-ls.com/assets/StatisticsPage-DVch4BZ1.js',
      'error loading dynamically imported module: https://learn-ls.com/assets/a.js',
      'Importing a module script failed.',
    ]) {
      expect(isStaleBuildError(new TypeError(message))).toBe(true);
    }
  });

  it('leaves every other error alone', () => {
    expect(isStaleBuildError(new TypeError('Cannot read properties of undefined'))).toBe(false);
    expect(isStaleBuildError(undefined)).toBe(false);
  });
});

describe('reloadForNewBuild', () => {
  const reload = vi.fn();

  beforeEach(() => {
    sessionStorage.clear();
    vi.stubGlobal('location', { ...window.location, reload });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    reload.mockReset();
  });

  it('reloads once, and not again moments later', () => {
    expect(reloadForNewBuild()).toBe(true);
    expect(reloadForNewBuild()).toBe(false);
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
