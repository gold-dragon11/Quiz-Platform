import { Suspense } from 'react';
import { Outlet, ScrollRestoration } from 'react-router-dom';
import { FullScreenLoader } from '@/shared/components/FullScreenLoader';

/**
 * Top-level layout wrapping the entire route tree (Phase 6.1 decisions
 * F10/F14). Two responsibilities:
 *
 * - `ScrollRestoration` implements the scroll policy (F14): scroll to top on
 *   PUSH navigations, restore the previous position on POP (back/forward).
 * - the `Suspense` boundary is the single fallback for lazily-loaded route
 *   chunks (F10) — feature pages are code-split via React.lazy and resolve
 *   under this boundary.
 */
export function RootLayout(): React.JSX.Element {
  return (
    <>
      <ScrollRestoration />
      <Suspense fallback={<FullScreenLoader />}>
        <Outlet />
      </Suspense>
    </>
  );
}
