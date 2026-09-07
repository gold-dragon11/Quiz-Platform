import { apiClient } from '@/lib/api-client';
import type {
  CreateGroupPayload,
  GroupStudent,
  JoinedGroup,
  StudentGroup,
  TeacherGroup,
} from '@/features/groups/types/group.types';

/** A teacher's own groups (`/teacher/groups`, teacher role required). */
export const teacherGroupsApi = {
  async list(): Promise<TeacherGroup[]> {
    const { data } = await apiClient.get<TeacherGroup[]>('/teacher/groups');
    return data;
  },

  async findOne(groupId: string): Promise<TeacherGroup> {
    const { data } = await apiClient.get<TeacherGroup>(`/teacher/groups/${groupId}`);
    return data;
  },

  async create(payload: CreateGroupPayload): Promise<TeacherGroup> {
    const { data } = await apiClient.post<TeacherGroup>('/teacher/groups', payload);
    return data;
  },

  /** Only the name — the subject is fixed at creation. */
  async rename(groupId: string, name: string): Promise<TeacherGroup> {
    const { data } = await apiClient.patch<TeacherGroup>(`/teacher/groups/${groupId}`, { name });
    return data;
  },

  /** Archiving is the closest thing to deletion a group has. */
  async archive(groupId: string): Promise<TeacherGroup> {
    const { data } = await apiClient.post<TeacherGroup>(`/teacher/groups/${groupId}/archive`);
    return data;
  },

  /** Replaces the code. The old one stops working immediately. */
  async regenerateInviteCode(groupId: string): Promise<TeacherGroup> {
    const { data } = await apiClient.post<TeacherGroup>(`/teacher/groups/${groupId}/invite-code`);
    return data;
  },

  async listStudents(groupId: string): Promise<GroupStudent[]> {
    const { data } = await apiClient.get<GroupStudent[]>(`/teacher/groups/${groupId}/students`);
    return data;
  },

  async removeStudent(groupId: string, studentId: string): Promise<void> {
    await apiClient.delete(`/teacher/groups/${groupId}/students/${studentId}`);
  },
};

/** The groups a learner belongs to (`/groups`). */
export const studentGroupsApi = {
  async list(): Promise<StudentGroup[]> {
    const { data } = await apiClient.get<StudentGroup[]>('/groups');
    return data;
  },

  /** Joining is idempotent — pasting the code twice is not a mistake. */
  async join(inviteCode: string): Promise<JoinedGroup> {
    const { data } = await apiClient.post<JoinedGroup>('/groups/join', { inviteCode });
    return data;
  },

  async leave(groupId: string): Promise<void> {
    await apiClient.delete(`/groups/${groupId}/membership`);
  },
};
