import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@/app/providers/ThemeProvider';
import { AppearanceSection } from '@/features/user/components/AppearanceSection';
import { usePinnedTheme } from '@/shared/hooks/use-theme';
import { useThemeStore } from '@/stores/theme-store';

/**
 * The theme is the one preference that never reaches the server, so nothing
 * but these tests stands between a chosen theme and a page that ignores it.
 * What matters is the attribute on `<html>`: every token in globals.css hangs
 * off it, so if it is right the whole interface is right.
 */

/** jsdom has no matchMedia; this is the OS setting the tests get to set. */
function osPrefersLight(light: boolean): { change: (next: boolean) => void } {
  const listeners = new Set<() => void>();
  let matches = light;

  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      media: query,
      get matches() {
        return query.includes('light') ? matches : !matches;
      },
      addEventListener: (_: string, listener: () => void) => listeners.add(listener),
      removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })),
  );

  return {
    change: (next) => {
      matches = next;
      listeners.forEach((listener) => listener());
    },
  };
}

const theme = (): string | null => document.documentElement.getAttribute('data-theme');

describe('ThemeProvider', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-theme');
    useThemeStore.setState({ preference: 'dark' });
    osPrefersLight(false);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('puts the chosen theme on the document', () => {
    useThemeStore.setState({ preference: 'light' });

    render(<ThemeProvider>ok</ThemeProvider>);

    expect(theme()).toBe('light');
  });

  it('follows the machine while the preference is «як у системі»', () => {
    const os = osPrefersLight(true);
    useThemeStore.setState({ preference: 'system' });

    render(<ThemeProvider>ok</ThemeProvider>);
    expect(theme()).toBe('light');

    // Evening: the laptop switches itself over, and an open tab follows it
    // rather than waiting for a reload.
    os.change(false);
    expect(theme()).toBe('dark');
  });

  it('ignores the machine once a theme was chosen outright', () => {
    const os = osPrefersLight(true);
    useThemeStore.setState({ preference: 'dark' });

    render(<ThemeProvider>ok</ThemeProvider>);
    os.change(false);

    expect(theme()).toBe('dark');
  });

  it('lets a screen pin its own theme, and gives it back on leaving', () => {
    useThemeStore.setState({ preference: 'light' });
    function Landing(): React.JSX.Element {
      usePinnedTheme('dark');
      return <p>Головна</p>;
    }

    const { rerender } = render(
      <ThemeProvider>
        <Landing />
      </ThemeProvider>,
    );
    expect(theme()).toBe('dark');

    rerender(<ThemeProvider>інша сторінка</ThemeProvider>);
    expect(theme()).toBe('light');
  });

  it('updates the colour of the phone’s address bar too', () => {
    const meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    meta.setAttribute('content', '#0b0a0f');
    document.head.append(meta);
    useThemeStore.setState({ preference: 'light' });

    render(<ThemeProvider>ok</ThemeProvider>);

    expect(meta.getAttribute('content')).toBe('#f7f6f9');
    meta.remove();
  });
});

describe('AppearanceSection', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-theme');
    useThemeStore.setState({ preference: 'dark' });
    osPrefersLight(false);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('changes the page when a theme is picked', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <AppearanceSection />
      </ThemeProvider>,
    );

    await user.click(screen.getByRole('radio', { name: /Світла/ }));

    expect(theme()).toBe('light');
    expect(useThemeStore.getState().preference).toBe('light');
    expect(screen.getByRole('radio', { name: /Світла/ })).toBeChecked();
  });

  it('offers following the system, which a two-position switch could not', async () => {
    const user = userEvent.setup();
    osPrefersLight(true);
    render(
      <ThemeProvider>
        <AppearanceSection />
      </ThemeProvider>,
    );

    await user.click(screen.getByRole('radio', { name: /Як у системі/ }));

    expect(theme()).toBe('light');
  });

  it('moves between the three options with the arrow keys', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <AppearanceSection />
      </ThemeProvider>,
    );

    screen.getByRole('radio', { name: /Темна/ }).focus();
    await user.keyboard('{ArrowRight}');

    expect(useThemeStore.getState().preference).toBe('light');
    expect(screen.getByRole('radio', { name: /Світла/ })).toHaveFocus();
  });
});
