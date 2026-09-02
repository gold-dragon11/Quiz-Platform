import { QuestionReportReason, QuestionReportStatus } from '@prisma/client';

/** A report as the reviewer sees it, with enough context to judge without digging. */
export interface QuestionReportView {
  id: string;
  reason: QuestionReportReason;
  comment: string | null;
  status: QuestionReportStatus;
  createdAt: Date;
  resolvedAt: Date | null;
  resolution: string | null;
  question: {
    id: string;
    title: string;
    topic: { id: string; name: string };
    subject: { id: string; name: string };
  };
  reportedBy: { id: string; displayName: string | null };
  /** How many open reports this question has in total — a repeated complaint
   * about one question is a stronger signal than five about five. */
  openReportsForQuestion: number;
}

export interface PaginatedReports {
  items: QuestionReportView[];
  total: number;
  page: number;
  pageSize: number;
}
