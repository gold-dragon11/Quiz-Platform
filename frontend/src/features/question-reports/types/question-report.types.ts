import type { QuestionReportReason, QuestionReportStatus } from '@/shared/types/enums';

/**
 * Question report types, mirrored from the backend
 * (`src/question-reports/types/question-report.types.ts`).
 */

/** Body of POST /questions/:questionId/report. */
export interface CreateReportPayload {
  reason: QuestionReportReason;
  /** Up to 1000 characters; optional for every reason. */
  comment?: string;
}

export interface QuestionReportView {
  id: string;
  reason: QuestionReportReason;
  comment: string | null;
  status: QuestionReportStatus;
  createdAt: string;
  resolvedAt: string | null;
  resolution: string | null;
  question: {
    id: string;
    title: string;
    topic: { id: string; name: string };
    subject: { id: string; name: string };
  };
  reportedBy: { id: string; displayName: string | null };
  openReportsForQuestion: number;
}

/**
 * What a learner picks from, in their words rather than the enum's.
 *
 * A fixed list rather than free text, and this is the backend's decision, not
 * a UI shortcut: a queue of prose takes longer to triage than the questions
 * themselves. The five categories are what actually goes wrong in this bank.
 */
export const REPORT_REASON_LABEL: Record<QuestionReportReason, string> = {
  WRONG_ANSWER: 'Неправильна відповідь у ключі',
  TYPO: 'Помилка або друкарська помилка в тексті',
  UNCLEAR: 'Умову сформульовано незрозуміло',
  BROKEN_FORMULA: 'Формула відображається неправильно',
  OTHER: 'Інше',
};
