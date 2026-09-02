import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from '@nestjs/common';
import { AdminOnly } from '../../auth/decorators/admin-only.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { ListReportsQueryDto } from '../dto/list-reports-query.dto';
import { ResolveReportDto } from '../dto/resolve-report.dto';
import { QuestionReportsService } from '../services/question-reports.service';
import {
  PaginatedReports,
  QuestionReportView,
} from '../types/question-report.types';

/**
 * The review queue (docs/04-api/admin.md). Content editing itself stays where
 * it was — a reviewer reads a report here and fixes the question through the
 * existing admin routes, because the fix is an ordinary edit and does not
 * deserve a second way to make it.
 */
@AdminOnly()
@Controller('admin/question-reports')
export class AdminQuestionReportsController {
  constructor(private readonly reportsService: QuestionReportsService) {}

  /** GET /api/v1/admin/question-reports — oldest first, filterable by status. */
  @Get()
  async list(@Query() query: ListReportsQueryDto): Promise<PaginatedReports> {
    return this.reportsService.list(query);
  }

  /** PATCH /api/v1/admin/question-reports/:reportId — accept or reject. */
  @Patch(':reportId')
  async resolve(
    @CurrentUser('id') reviewerId: string,
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @Body() dto: ResolveReportDto,
  ): Promise<QuestionReportView> {
    return this.reportsService.resolve(reviewerId, reportId, dto);
  }
}
