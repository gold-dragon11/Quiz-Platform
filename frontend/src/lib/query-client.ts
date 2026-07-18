import { QueryClient } from '@tanstack/react-query';

/**
 * Shared TanStack Query client. Default options are intentionally minimal for
 * the foundation phase — per-query tuning happens alongside the queries
 * themselves once features exist.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
