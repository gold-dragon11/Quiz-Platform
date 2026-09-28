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
  localStorage.clear();
});

afterAll(() => server.close());

/*
 * Node ships its own `localStorage` from v22, and without `--localstorage-file`
 * it is a hollow object with no `setItem` — which is what anything persisted
 * (the session hint, a theme preference) reaches for. jsdom's own
 * `sessionStorage` is untouched and is left alone.
 *
 * Both `window` and the Node global are given the shim, deliberately: here they
 * are not the same object, and a module reaching for the bare `localStorage`
 * binding lands on whichever its own scope resolves to. Shimming one leaves the
 * other hollow, and the failure is silent — the guarded reads in the app come
 * back as «nothing stored» rather than as an error.
 *
 * A Map rather than jsdom's implementation: the suite only needs a store that
 * keeps what it was given and starts each test empty.
 */
const memory = new Map<string, string>();
const memoryStorage = {
  getItem: (key: string) => memory.get(key) ?? null,
  setItem: (key: string, value: string) => void memory.set(key, String(value)),
  removeItem: (key: string) => void memory.delete(key),
  clear: () => memory.clear(),
  key: (index: number) => [...memory.keys()][index] ?? null,
  get length() {
    return memory.size;
  },
} satisfies Storage;

Object.defineProperty(window, 'localStorage', { writable: true, value: memoryStorage });
Object.defineProperty(globalThis, 'localStorage', { writable: true, value: memoryStorage });

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
