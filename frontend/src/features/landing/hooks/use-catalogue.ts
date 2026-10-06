import { useQuery } from '@tanstack/react-query';
import { fetchCatalogue } from '@/features/landing/api/catalogue.api';

/**
 * The catalogue query.
 *
 * The section needs the outcome, not just the data: when the API cannot be
 * reached the whole section — heading and all — has to disappear. Hiding only
 * the body left an orphaned heading over nothing, which reads as a broken page
 * rather than a quiet one.
 *
 * Retried with backoff rather than once. In production the API sleeps on a
 * free instance, so «unreachable» usually means «waking up», and giving up
 * after one attempt would blank the section for every first visitor of the
 * morning.
 */
export function useCatalogue() {
  return useQuery({
    queryKey: ['landing', 'catalogue'],
    queryFn: fetchCatalogue,
    staleTime: 60 * 60 * 1000,
    retry: 3,
    retryDelay: (attempt) => Math.min(2000 * 2 ** attempt, 15000),
  });
}
