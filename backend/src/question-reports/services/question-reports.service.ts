import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, QuestionReportStatus } from '@prisma/client';
import { CreateReportDto } from '../dto/create-report.dto';
import { ListReportsQueryDto } from '../dto/list-reports-query.dto';
import { ResolveReportDto } from '../dto/resolve-report.dto';
import {
  QuestionReportsRepository,
  ReportRow,
} from '../repositories/question-reports.repository';
import {
  PaginatedReports,
  QuestionReportView,
} from '../types/question-report.types';

const QUESTION_NOT_FOUND_MESSAGE = 'Запитання не знайдено.';
const REPORT_NOT_FOUND_MESSAGE = 'Скаргу не знайдено.';
const ALREADY_REPORTED_MESSAGE =
  'Ви вже повідомили про це запитання. Ми розберемося.';
const ALREADY_RESOLVED_MESSAGE = 'Цю скаргу вже розглянуто.';

/**
 * Question reports (docs/02-domain/question-report.md).
 *
 * The cheapest quality control the bank has: 3 308 questions written in one
 * pass will contain mistakes, and the people best placed to find them are the
 * ones sitting the quiz. It also answers, with evidence, the question a buyer
 * eventually asks — whether there is a process behind the content.
 */
@Injectable()
export class QuestionReportsService {
  constructor(private readonly reportsRepository: QuestionReportsRepository) {}

  /**
   * Files a complaint. Open to anyone signed in: a report carries no data back
   * and costs a reviewer a glance, so the cost of a spurious one is far below
   * the cost of a wrong question nobody could flag.
   */
  async report(
    userId: string,
    questionId: string,
    dto: CreateReportDto,
  ): Promise<QuestionReportView> {
    if (!(await this.reportsRepository.questionIsReportable(questionId))) {
      throw new NotFoundException(QUESTION_NOT_FOUND_MESSAGE);
    }

    try {
      const report = await this.reportsRepository.create({
        questionId,
        reportedById: userId,
        reason: dto.reason,
        comment: dto.comment,
      });
      // Counted, not assumed: the number is the point of the field — several
      // people complaining about one question is a far stronger signal than
      // several complaints spread across the bank.
      const counts = await this.reportsRepository.openCountsByQuestion([
        questionId,
      ]);
      return this.toView(report, counts.get(questionId) ?? 1);
    } catch (error) {
      // The partial unique index holds the one-open-report rule; hitting it is
      // the same person reporting the same question twice, which is a
      // duplicate, not a failure.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(ALREADY_REPORTED_MESSAGE);
      }
      throw error;
    }
  }

  /** The review queue, oldest first, open by default. */
  async list(query: ListReportsQueryDto): Promise<PaginatedReports> {
    const { items, total } = await this.reportsRepository.list({
      status: query.status,
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    });

    const counts = await this.reportsRepository.openCountsByQuestion(
      items.map((item) => item.question.id),
    );

    return {
      items: items.map((item) =>
        this.toView(item, counts.get(item.question.id) ?? 0),
      ),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  /**
   * Closes a report. There is no path back to NEW: reopening is what filing a
   * fresh report is for, and the index permits that once this one is closed.
   */
  async resolve(
    reviewerId: string,
    reportId: string,
    dto: ResolveReportDto,
  ): Promise<QuestionReportView> {
    const existing = await this.reportsRepository.findById(reportId);
    if (!existing) {
      throw new NotFoundException(REPORT_NOT_FOUND_MESSAGE);
    }
    if (existing.status !== QuestionReportStatus.NEW) {
      throw new ConflictException(ALREADY_RESOLVED_MESSAGE);
    }

    const report = await this.reportsRepository.resolve(reportId, {
      status: dto.status,
      resolution: dto.resolution,
      resolvedById: reviewerId,
    });
    const counts = await this.reportsRepository.openCountsByQuestion([
      report.question.id,
    ]);

    return this.toView(report, counts.get(report.question.id) ?? 0);
  }

  private toView(
    report: ReportRow,
    openReportsForQuestion: number,
  ): QuestionReportView {
    return {
      id: report.id,
      reason: report.reason,
      comment: report.comment,
      status: report.status,
      createdAt: report.createdAt,
      resolvedAt: report.resolvedAt,
      resolution: report.resolution,
      question: {
        id: report.question.id,
        title: report.question.title,
        topic: {
          id: report.question.topic.id,
          name: report.question.topic.name,
        },
        subject: report.question.topic.subject,
      },
      reportedBy: {
        id: report.reportedBy.id,
        displayName: report.reportedBy.profile?.displayName ?? null,
      },
      openReportsForQuestion,
    };
  }
}
