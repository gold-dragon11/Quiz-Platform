import { apiClient } from '@/lib/api-client';
import type { QuizSessionMetadata } from '@/features/quiz/types/quiz.types';
import type { CreateDuelPayload, DuelView } from '@/features/duels/types/duel.types';

/**
 * Duel endpoints. Thin wrappers over the shared apiClient — no direct Axios,
 * and no reshaping of what the backend returns.
 */
export const duelsApi = {
  /** POST /duels — challenges somebody by username. The paper waits for accept. */
  async challenge(payload: CreateDuelPayload): Promise<DuelView> {
    const { data } = await apiClient.post<DuelView>('/duels', payload);
    return data;
  },

  /** GET /duels — every duel this person is in, newest first. */
  async list(): Promise<DuelView[]> {
    const { data } = await apiClient.get<DuelView[]>('/duels');
    return data;
  },

  async findOne(duelId: string): Promise<DuelView> {
    const { data } = await apiClient.get<DuelView>(`/duels/${duelId}`);
    return data;
  },

  async accept(duelId: string): Promise<DuelView> {
    const { data } = await apiClient.post<DuelView>(`/duels/${duelId}/accept`);
    return data;
  },

  async decline(duelId: string): Promise<DuelView> {
    const { data } = await apiClient.post<DuelView>(`/duels/${duelId}/decline`);
    return data;
  },

  /** POST /duels/:duelId/play — starts (or resumes) this player's half. */
  async play(duelId: string): Promise<QuizSessionMetadata> {
    const { data } = await apiClient.post<QuizSessionMetadata>(`/duels/${duelId}/play`);
    return data;
  },
};
