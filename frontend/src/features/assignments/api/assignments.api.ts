import { apiClient } from '@/lib/api-client';
import type { Paginated } from '@/shared/types/api';
import type { QuizSessionMetadata } from '@/features/quiz/types/quiz.types';
import type {
  GroupAnalytics,
  QuestionBreakdownRow,
  StudentProfile,
  SubmissionRow,
} from '@/features/assignments/types/review.types';
import type {
  CreateAssignmentPayload,
  PickableQuestion,
  StudentAssignment,
  TeacherAssignment,
} from '@/features/assignments/types/assignment.types';

/** Issuing and editing homework (`/teacher/*`, teacher role required). */
export const teacherAssignmentsApi = {
  async listForGroup(groupId: string): Promise<TeacherAssignment[]> {
    const { data } = await apiClient.get<TeacherAssignment[]>(`/teacher/groups/${groupId}/assignments`);
    return data;
  },

  async findOne(assignmentId: string): Promise<TeacherAssignment> {
    const { data } = await apiClient.get<TeacherAssignment>(`/teacher/assignments/${assignmentId}`);
    return data;
  },

  async create(groupId: string, payload: CreateAssignmentPayload): Promise<TeacherAssignment> {
    const { data } = await apiClient.post<TeacherAssignment>(
      `/teacher/groups/${groupId}/assignments`,
      payload,
    );
    return data;
  },

  /**
   * Title, description and deadline only. The question list and the recipient
   * list were frozen at issue and the API accepts nothing else.
   */
  async update(
    assignmentId: string,
    payload: { title?: string; description?: string; dueAt?: string },
  ): Promise<TeacherAssignment> {
    const { data } = await apiClient.patch<TeacherAssignment>(
      `/teacher/assignments/${assignmentId}`,
      payload,
    );
    return data;
  },
};

/** Homework as a student sees it (`/assignments`). */
export const studentAssignmentsApi = {
  async list(): Promise<StudentAssignment[]> {
    const { data } = await apiClient.get<StudentAssignment[]>('/assignments');
    return data;
  },

  async findOne(assignmentId: string): Promise<StudentAssignment> {
    const { data } = await apiClient.get<StudentAssignment>(`/assignments/${assignmentId}`);
    return data;
  },

  /** Starts — or resumes — this student's attempt. */
  async start(assignmentId: string): Promise<QuizSessionMetadata> {
    const { data } = await apiClient.post<QuizSessionMetadata>(`/assignments/${assignmentId}/start`);
    return data;
  },
};

/**
 * The question browser behind MANUAL selection.
 *
 * `GET /topics/:topicId/questions` is the ordinary delivery endpoint — open to
 * any authenticated account and never carrying correct answers — so the picker
 * needs no privileged surface of its own.
 */
export const pickableQuestionsApi = {
  async listForTopic(
    topicId: string,
    params: { page: number; pageSize: number },
  ): Promise<Paginated<PickableQuestion>> {
    const { data } = await apiClient.get<Paginated<PickableQuestion>>(`/topics/${topicId}/questions`, {
      params,
    });
    return data;
  },
};

/**
 * What happened after the work went out (`/teacher/*`, teacher role required).
 *
 * Four reads, and they answer four different questions: who handed in, what
 * the class got wrong, how one learner is doing, and where the group stands.
 */
export const teacherReviewApi = {
  async submissions(assignmentId: string): Promise<SubmissionRow[]> {
    const { data } = await apiClient.get<SubmissionRow[]>(`/teacher/assignments/${assignmentId}/submissions`);
    return data;
  },

  async questionBreakdown(assignmentId: string): Promise<QuestionBreakdownRow[]> {
    const { data } = await apiClient.get<QuestionBreakdownRow[]>(
      `/teacher/assignments/${assignmentId}/questions`,
    );
    return data;
  },

  async studentProfile(groupId: string, studentId: string): Promise<StudentProfile> {
    const { data } = await apiClient.get<StudentProfile>(`/teacher/groups/${groupId}/students/${studentId}`);
    return data;
  },

  async groupAnalytics(groupId: string): Promise<GroupAnalytics> {
    const { data } = await apiClient.get<GroupAnalytics>(`/teacher/groups/${groupId}/analytics`);
    return data;
  },
};
