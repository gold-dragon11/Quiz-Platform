import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { questionBankApi } from '@/features/question-bank/api/question-bank.api';
import type { BankQuery } from '@/features/question-bank/types/question-bank.types';

export const QUESTION_BANK_QUERY_KEYS = {
  list: (query: BankQuery) => ['question-bank', 'list', query] as const,
};

export function useQuestionBank(query: BankQuery) {
  return useQuery({
    queryKey: QUESTION_BANK_QUERY_KEYS.list(query),
    queryFn: () => questionBankApi.list(query),
    placeholderData: keepPreviousData,
  });
}
