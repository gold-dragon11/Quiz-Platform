import { apiClient } from '@/lib/api-client';
import type { Paginated } from '@/shared/types/api';
import type { BankQuery, BankQuestionWithOptions } from '@/features/question-bank/types/question-bank.types';

/**
 * The teacher's read of the question bank.
 *
 * `isPublished` is deliberately absent from the query: the server pins it, and
 * sending it is refused rather than ignored. Accepted-and-ignored would look
 * identical to working.
 */
export const questionBankApi = {
  async list(query: BankQuery): Promise<Paginated<BankQuestionWithOptions>> {
    const { data } = await apiClient.get<Paginated<BankQuestionWithOptions>>('/teacher/questions', {
      params: query,
    });
    return data;
  },
};
