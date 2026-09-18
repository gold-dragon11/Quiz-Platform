import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { duelsApi } from '@/features/duels/api/duels.api';
import type { CreateDuelPayload } from '@/features/duels/types/duel.types';
import { QUIZ_QUERY_KEYS } from '@/features/quiz/hooks/use-quiz';

/**
 * Duel queries + mutations.
 *
 * Every mutation invalidates the list as well as the single duel: accepting or
 * declining changes which group a duel belongs to on the index, and playing
 * one occupies the single active-session slot the rest of the app watches.
 */

export const DUEL_QUERY_KEYS = {
  list: ['duels', 'list'] as const,
  one: (duelId: string) => ['duels', 'one', duelId] as const,
  liveAvailability: (subjectId: string, topicId: string) =>
    ['duels', 'live-availability', subjectId, topicId] as const,
};

export function useDuels() {
  return useQuery({
    queryKey: DUEL_QUERY_KEYS.list,
    queryFn: () => duelsApi.list(),
  });
}

export function useDuel(duelId: string) {
  return useQuery({
    queryKey: DUEL_QUERY_KEYS.one(duelId),
    queryFn: () => duelsApi.findOne(duelId),
    retry: false,
  });
}

export function useChallenge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateDuelPayload) => duelsApi.challenge(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: DUEL_QUERY_KEYS.list });
    },
  });
}

export function useRespondToDuel(duelId: string) {
  const queryClient = useQueryClient();
  const invalidate = (): void => {
    void queryClient.invalidateQueries({ queryKey: DUEL_QUERY_KEYS.list });
    void queryClient.invalidateQueries({ queryKey: DUEL_QUERY_KEYS.one(duelId) });
  };

  const accept = useMutation({
    mutationFn: () => duelsApi.accept(duelId),
    onSuccess: invalidate,
  });
  const decline = useMutation({
    mutationFn: () => duelsApi.decline(duelId),
    onSuccess: invalidate,
  });

  return { accept, decline };
}

export function usePlayDuel(duelId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => duelsApi.play(duelId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUIZ_QUERY_KEYS.active });
      void queryClient.invalidateQueries({ queryKey: DUEL_QUERY_KEYS.one(duelId) });
      void queryClient.invalidateQueries({ queryKey: DUEL_QUERY_KEYS.list });
    },
  });
}

/** For each live time, how many questions of the subject (or topic) fit it. */
export function useLiveAvailability(subjectId: string, topicId = '') {
  return useQuery({
    queryKey: DUEL_QUERY_KEYS.liveAvailability(subjectId, topicId),
    queryFn: () => duelsApi.liveAvailability(subjectId, topicId || undefined),
    enabled: subjectId !== '',
    staleTime: 5 * 60 * 1000,
  });
}
