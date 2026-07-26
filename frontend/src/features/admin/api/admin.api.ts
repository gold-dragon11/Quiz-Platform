import { apiClient } from '@/lib/api-client';
import type { Paginated } from '@/shared/types/api';
import type {
  AdminListParams,
  CreateQuestionPayload,
  CreateQuizPayload,
  CreateSubjectPayload,
  CreateTopicPayload,
  QuestionRecord,
  QuizRecord,
  SubjectRecord,
  TopicRecord,
  UpdateQuestionPayload,
  UpdateQuizPayload,
  UpdateSubjectPayload,
  UpdateTopicPayload,
} from '@/features/admin/types/admin.types';

/**
 * Admin API layer (Phase 6.8) — typed wrappers over the shared apiClient for
 * the documented `admin/*` endpoints (docs/04-api/admin.md). Every route is
 * administrator-only server-side (401/403 enforced by the backend). No feature
 * touches Axios directly. DELETE responds 204 (void); PATCH publish toggles a
 * question's publication state.
 */

export const adminSubjectsApi = {
  list: async (params: AdminListParams): Promise<Paginated<SubjectRecord>> =>
    (await apiClient.get<Paginated<SubjectRecord>>('/admin/subjects', { params })).data,
  create: async (payload: CreateSubjectPayload): Promise<SubjectRecord> =>
    (await apiClient.post<SubjectRecord>('/admin/subjects', payload)).data,
  update: async (id: string, payload: UpdateSubjectPayload): Promise<SubjectRecord> =>
    (await apiClient.put<SubjectRecord>(`/admin/subjects/${id}`, payload)).data,
  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/admin/subjects/${id}`);
  },
};

export const adminTopicsApi = {
  list: async (params: AdminListParams): Promise<Paginated<TopicRecord>> =>
    (await apiClient.get<Paginated<TopicRecord>>('/admin/topics', { params })).data,
  create: async (payload: CreateTopicPayload): Promise<TopicRecord> =>
    (await apiClient.post<TopicRecord>('/admin/topics', payload)).data,
  update: async (id: string, payload: UpdateTopicPayload): Promise<TopicRecord> =>
    (await apiClient.put<TopicRecord>(`/admin/topics/${id}`, payload)).data,
  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/admin/topics/${id}`);
  },
};

export const adminQuestionsApi = {
  list: async (params: AdminListParams): Promise<Paginated<QuestionRecord>> =>
    (
      await apiClient.get<Paginated<QuestionRecord>>('/admin/questions', {
        params,
      })
    ).data,
  create: async (payload: CreateQuestionPayload): Promise<QuestionRecord> =>
    (await apiClient.post<QuestionRecord>('/admin/questions', payload)).data,
  update: async (id: string, payload: UpdateQuestionPayload): Promise<QuestionRecord> =>
    (await apiClient.put<QuestionRecord>(`/admin/questions/${id}`, payload)).data,
  publish: async (id: string, isPublished: boolean): Promise<QuestionRecord> =>
    (
      await apiClient.patch<QuestionRecord>(`/admin/questions/${id}/publish`, {
        isPublished,
      })
    ).data,
  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/admin/questions/${id}`);
  },
};

export const adminQuizzesApi = {
  list: async (params: AdminListParams): Promise<Paginated<QuizRecord>> =>
    (await apiClient.get<Paginated<QuizRecord>>('/admin/quizzes', { params })).data,
  create: async (payload: CreateQuizPayload): Promise<QuizRecord> =>
    (await apiClient.post<QuizRecord>('/admin/quizzes', payload)).data,
  update: async (id: string, payload: UpdateQuizPayload): Promise<QuizRecord> =>
    (await apiClient.put<QuizRecord>(`/admin/quizzes/${id}`, payload)).data,
  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/admin/quizzes/${id}`);
  },
};
