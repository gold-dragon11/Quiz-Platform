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

/**
 * The bank, laid out as a table of contents rather than counted in tiles.
 *
 * The four tiles this replaced had two problems. The smaller one: «4 предмети»
 * shouted at the same size as «3308 запитань», advertising the weakest fact as
 * loudly as the strongest. The larger one: «76 тем» and «76 навчальних
 * матеріалів» were the *same fact counted twice* — every topic has exactly one
 * material — and nobody noticed, because tiles are looked at rather than read.
 *
 * Topic names can be read and judged: a candidate sees whether what they need
 * is covered. Four numbers never told them that. The numbers move into the one
 * sentence at the bottom, where the 76 = 76 coincidence becomes the claim it
 * always was: every topic has a material.
 *
 * Ordered by question count, so the strongest subject opens the list and «4
 * предмети» disappears as a figure — you can see there are four.
 */
