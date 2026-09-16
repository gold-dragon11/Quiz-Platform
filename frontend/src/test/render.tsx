import type { ReactElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ToastProvider } from '@/app/providers/ToastProvider';

interface RenderOptions {
  /** Route pattern the screen is mounted at, e.g. '/quiz/:sessionId'. */
  path?: string;
  /** Address the test starts at, e.g. '/quiz/s-1'. */
  route?: string;
  /** Extra routes, so a redirect can be asserted by what it lands on. */
  also?: { path: string; element: ReactElement }[];
}

/**
 * Renders one screen the way the application renders it: inside the query
 * client, the toast channel and a router.
 *
 * A fresh QueryClient per test, with retries off — the shared one would carry
 * a previous test's cache, and a retry would turn an expected 404 into a
 * multi-second wait.
 */
export function renderScreen(
  ui: ReactElement,
  { path = '/', route = '/', also = [] }: RenderOptions = {},
): RenderResult & { user: ReturnType<typeof userEvent.setup> } {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  const result = render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <MemoryRouter initialEntries={[route]}>
          <Routes>
            <Route path={path} element={ui} />
            {also.map((extra) => (
              <Route key={extra.path} path={extra.path} element={extra.element} />
            ))}
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );

  return { ...result, user: userEvent.setup() };
}
