import { Injectable } from '@nestjs/common';
import {
  Prisma,
  QuestionReportReason,
  QuestionReportStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const REPORT_SELECT = {
  id: true,
  reason: true,
  comment: true,
  status: true,
  createdAt: true,
  resolvedAt: true,
  resolution: true,
  question: {
    select: {
      id: true,
      title: true,
      topic: {
        select: {
          id: true,
          name: true,
          subject: { select: { id: true, name: true } },
        },
      },
    },
  },
  reportedBy: {
    select: { id: true, profile: { select: { displayName: true } } },
  },
} as const;

export type ReportRow = Prisma.QuestionReportGetPayload<{
  select: typeof REPORT_SELECT;
}>;

/** Data access for question reports (docs/02-domain/question-report.md). */
@Injectable()
export class QuestionReportsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    questionId: string;
    reportedById: string;
    reason: QuestionReportReason;
    comment?: string;
  }): Promise<ReportRow> {
    return this.prisma.questionReport.create({
      data,
      select: REPORT_SELECT,
    });
  }

  async findById(reportId: string): Promise<ReportRow | null> {
    return this.prisma.questionReport.findUnique({
      where: { id: reportId },
      select: REPORT_SELECT,
    });
  }

  async list(params: {
    status?: QuestionReportStatus;
    skip: number;
    take: number;
  }): Promise<{ items: ReportRow[]; total: number }> {
    const where: Prisma.QuestionReportWhereInput = params.status
      ? { status: params.status }
      : {};

    const [items, total] = await Promise.all([
      this.prisma.questionReport.findMany({
        where,
        select: REPORT_SELECT,
        // Oldest first: a queue worked newest-first leaves its tail forever.
        orderBy: { createdAt: 'asc' },
        skip: params.skip,
        take: params.take,
      }),
      this.prisma.questionReport.count({ where }),
    ]);

    return { items, total };
  }

  async resolve(
    reportId: string,
    data: {
      status: QuestionReportStatus;
      resolution?: string;
      resolvedById: string;
    },
  ): Promise<ReportRow> {
    return this.prisma.questionReport.update({
      where: { id: reportId },
      data: {
        status: data.status,
        resolution: data.resolution,
        resolvedById: data.resolvedById,
        resolvedAt: new Date(),
      },
      select: REPORT_SELECT,
    });
  }

  /** Open reports per question, so a repeated complaint reads as a stronger one. */
  async openCountsByQuestion(
    questionIds: string[],
  ): Promise<Map<string, number>> {
    if (questionIds.length === 0) {
      return new Map();
    }

    const rows = await this.prisma.questionReport.groupBy({
      by: ['questionId'],
      where: {
        questionId: { in: questionIds },
        status: QuestionReportStatus.NEW,
      },
      _count: { _all: true },
    });

    return new Map(rows.map((row) => [row.questionId, row._count._all]));
  }

  /** True when the question exists and is visible to ordinary users. */
  async questionIsReportable(questionId: string): Promise<boolean> {
    const question = await this.prisma.question.findFirst({
      where: {
        id: questionId,
        isPublished: true,
        deletedAt: null,
        topic: { deletedAt: null },
      },
      select: { id: true },
    });
    return question !== null;
  }
}
