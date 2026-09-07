import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { studentGroupsApi, teacherGroupsApi } from '@/features/groups/api/groups.api';
import type { CreateGroupPayload } from '@/features/groups/types/group.types';

/**
 * Group queries + mutations.
 *
 * The teacher's list and one group's detail share a prefix, so every action
 * that changes a group — renaming it, archiving it, replacing its code,
 * removing a student — refreshes both with one invalidation. Roster size shows
 * on the list card, so a removal that only refreshed the detail page would
 * leave the list quietly wrong.
 */

export const GROUP_QUERY_KEYS = {
  teacher: ['groups', 'teacher'] as const,
  teacherOne: (groupId: string) => ['groups', 'teacher', groupId] as const,
  roster: (groupId: string) => ['groups', 'teacher', groupId, 'students'] as const,
  student: ['groups', 'student'] as const,
};

// ------------------------------------------------------------------ teacher

export function useTeacherGroups() {
  return useQuery({
    queryKey: GROUP_QUERY_KEYS.teacher,
    queryFn: () => teacherGroupsApi.list(),
  });
}

export function useTeacherGroup(groupId: string) {
  return useQuery({
    queryKey: GROUP_QUERY_KEYS.teacherOne(groupId),
    queryFn: () => teacherGroupsApi.findOne(groupId),
    retry: false,
  });
}

export function useGroupRoster(groupId: string) {
  return useQuery({
    queryKey: GROUP_QUERY_KEYS.roster(groupId),
    queryFn: () => teacherGroupsApi.listStudents(groupId),
  });
}

export function useCreateGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateGroupPayload) => teacherGroupsApi.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: GROUP_QUERY_KEYS.teacher });
    },
  });
}

/** Rename, archive, new invite code, remove a student — all refresh the same tree. */
export function useGroupActions(groupId: string) {
  const queryClient = useQueryClient();
  const refresh = (): void => {
    void queryClient.invalidateQueries({ queryKey: GROUP_QUERY_KEYS.teacher });
    // The roster now shows each student's standing, and that lives under the
    // review keys — removing somebody has to drop them from both.
    void queryClient.invalidateQueries({ queryKey: ['review'] });
  };

  return {
    rename: useMutation({
      mutationFn: (name: string) => teacherGroupsApi.rename(groupId, name),
      onSuccess: refresh,
    }),
    archive: useMutation({
      mutationFn: () => teacherGroupsApi.archive(groupId),
      onSuccess: refresh,
    }),
    regenerateInviteCode: useMutation({
      mutationFn: () => teacherGroupsApi.regenerateInviteCode(groupId),
      onSuccess: refresh,
    }),
    removeStudent: useMutation({
      mutationFn: (studentId: string) => teacherGroupsApi.removeStudent(groupId, studentId),
      onSuccess: refresh,
    }),
  };
}

// ------------------------------------------------------------------ student

export function useStudentGroups() {
  return useQuery({
    queryKey: GROUP_QUERY_KEYS.student,
    queryFn: () => studentGroupsApi.list(),
  });
}

export function useJoinGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (inviteCode: string) => studentGroupsApi.join(inviteCode),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: GROUP_QUERY_KEYS.student });
    },
  });
}

export function useLeaveGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (groupId: string) => studentGroupsApi.leave(groupId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: GROUP_QUERY_KEYS.student });
    },
  });
}
