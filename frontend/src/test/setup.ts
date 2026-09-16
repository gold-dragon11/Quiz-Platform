import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from './server';
import { useAuthStore } from '@/stores/auth-store';
import { useToastStore } from '@/stores/toast-store';

/**
 * `onUnhandledRequest: 'error'` on purpose: a screen that quietly calls an
 * endpoint nobody declared is the bug this suite exists to catch, so the test
 * fails instead of hanging on a request that never resolves.
 */
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));

afterEach(() => {
  server.resetHandlers();
  cleanup();
  // Zustand stores live outside React, so they survive unmounting and would
  // leak one test's session or toasts into the next.
  useAuthStore.setState({ status: 'loading', accessToken: null });
  useToastStore.setState({ toasts: [] });
  sessionStorage.clear();
});

afterAll(() => server.close());

// jsdom implements neither, and both are called during ordinary rendering:
// Framer Motion asks about reduced motion, the quiz screens scroll to a card.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }),
});
Element.prototype.scrollIntoView = () => {};
