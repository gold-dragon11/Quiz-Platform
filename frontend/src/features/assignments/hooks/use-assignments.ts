import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  pickableQuestionsApi,
  studentAssignmentsApi,
  teacherAssignmentsApi,
} from '@/features/assignments/api/assignments.api';
import type { CreateAssignmentPayload } from '@/features/assignments/types/assignment.types';
import { QUIZ_QUERY_KEYS } from '@/features/quiz/hooks/use-quiz';

export const ASSIGNMENT_QUERY_KEYS = {
  forGroup: (groupId: string) => ['assignments', 'group', groupId] as const,
  teacherOne: (assignmentId: string) => ['assignments', 'teacher', assignmentId] as const,
  student: ['assignments', 'student'] as const,
  studentOne: (assignmentId: string) => ['assignments', 'student', assignmentId] as const,
  pickable: (topicId: string, page: number) => ['assignments', 'pickable', topicId, page] as const,
};

// ------------------------------------------------------------------ teacher

export function useGroupAssignments(groupId: string) {
  return useQuery({
    queryKey: ASSIGNMENT_QUERY_KEYS.forGroup(groupId),
    queryFn: () => teacherAssignmentsApi.listForGroup(groupId),
  });
}

export function useCreateAssignment(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateAssignmentPayload) => teacherAssignmentsApi.create(groupId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ASSIGNMENT_QUERY_KEYS.forGroup(groupId) });
    },
  });
}

/** Disabled until a topic is chosen — the picker is per topic. */
export function usePickableQuestions(topicId: string | undefined, page: number) {
  return useQuery({
    queryKey: ASSIGNMENT_QUERY_KEYS.pickable(topicId ?? '', page),
    queryFn: () => pickableQuestionsApi.listForTopic(topicId as string, { page, pageSize: 20 }),
    enabled: Boolean(topicId),
    placeholderData: keepPreviousData,
  });
}

// ------------------------------------------------------------------ student

export function useStudentAssignments() {
  return useQuery({
    queryKey: ASSIGNMENT_QUERY_KEYS.student,
    queryFn: () => studentAssignmentsApi.list(),
  });
}

export function useStudentAssignment(assignmentId: string) {
  return useQuery({
    queryKey: ASSIGNMENT_QUERY_KEYS.studentOne(assignmentId),
    queryFn: () => studentAssignmentsApi.findOne(assignmentId),
    retry: false,
  });
}

/**
 * Starting homework occupies the one active-session slot for this subject, so
 * the shared `quiz.active` entry is refreshed alongside the assignment lists.
 */
export function useStartAssignment(assignmentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => studentAssignmentsApi.start(assignmentId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUIZ_QUERY_KEYS.active });
      void queryClient.invalidateQueries({ queryKey: ASSIGNMENT_QUERY_KEYS.student });
      void queryClient.invalidateQueries({
        queryKey: ASSIGNMENT_QUERY_KEYS.studentOne(assignmentId),
      });
    },
  });
}
