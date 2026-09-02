import {
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CreateReportDto } from '../dto/create-report.dto';
import { QuestionReportsService } from '../services/question-reports.service';
import { QuestionReportView } from '../types/question-report.types';

/**
 * Reporting a question (docs/02-domain/question-report.md).
 *
 * Any signed-in reader may report — students hit the bad questions, and they
 * are the ones who notice. No role gate: a report returns no data and costs a
 * reviewer a glance, while a wrong question nobody can flag costs the trust of
 * everyone who meets it.
 */
@UseGuards(JwtAuthGuard)
@Controller('questions')
export class QuestionReportsController {
  constructor(private readonly reportsService: QuestionReportsService) {}

  /** POST /api/v1/questions/:questionId/report */
  @Post(':questionId/report')
  async report(
    @CurrentUser('id') userId: string,
    @Param('questionId', ParseUUIDPipe) questionId: string,
    @Body() dto: CreateReportDto,
  ): Promise<QuestionReportView> {
    return this.reportsService.report(userId, questionId, dto);
  }
}
