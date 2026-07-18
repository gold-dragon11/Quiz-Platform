import type { PropsWithChildren } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/query-client';

/**
 * Composes every global provider the application needs. Router is provided
 * separately via RouterProvider in App.tsx, since it renders the tree rather
 * than wrapping it.
 */
export function AppProviders({ children }: PropsWithChildren): React.JSX.Element {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
