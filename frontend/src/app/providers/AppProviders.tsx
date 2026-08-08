import type { PropsWithChildren } from 'react';
import { MotionConfig } from 'framer-motion';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/query-client';
import { AppErrorBoundary } from '@/shared/components/AppErrorBoundary';
import { ThemeProvider } from './ThemeProvider';
import { ToastProvider } from './ToastProvider';
import { AuthBootstrap } from './AuthBootstrap';

/**
 * Composes every global provider in the exact order fixed by Phase 6.1
 * decision F6:
 *
 *   AppErrorBoundary → QueryClientProvider → ThemeProvider → MotionConfig
 *     → ToastProvider → AuthBootstrap → (children = RouterProvider)
 *
 * Rationale for the order:
 * - the error boundary is outermost so it can catch failures from any provider;
 * - Query sits above the app so hooks (incl. AuthBootstrap's session refresh)
 *   have a client;
 * - Theme applies `data-theme` before anything paints;
 * - MotionConfig(`reducedMotion="user"`) makes every animation honor the OS
 *   reduced-motion setting;
 * - ToastProvider mounts the toast channel above the app;
 * - AuthBootstrap runs the startup silent refresh just outside the router.
 *
 * `RouterProvider` is intentionally passed in as `children` from App.tsx (it
 * renders the tree rather than wrapping it), so it stays the innermost layer.
 */
export function AppProviders({ children }: PropsWithChildren): React.JSX.Element {
  return (
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <MotionConfig reducedMotion="user">
            <ToastProvider>
              <AuthBootstrap>{children}</AuthBootstrap>
            </ToastProvider>
          </MotionConfig>
        </ThemeProvider>
      </QueryClientProvider>
    </AppErrorBoundary>
  );
}
