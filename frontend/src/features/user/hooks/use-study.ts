import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { userApi } from '@/features/user/api/user.api';

export const STUDY_QUERY_KEY = ['users', 'me', 'study'] as const;

/** The learner's subjects and whether the dashboard opens on the first screen. */
export function useStudy() {
  return useQuery({
    queryKey: STUDY_QUERY_KEY,
    queryFn: () => userApi.getStudy(),
  });
}

/** Answers the first screen; an empty list skips it. */
export function useUpdateStudy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (subjectIds: string[]) => userApi.updateStudy(subjectIds),
    onSuccess: (study) => {
      queryClient.setQueryData(STUDY_QUERY_KEY, study);
    },
  });
}
