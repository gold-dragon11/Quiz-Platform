import { Module } from '@nestjs/common';
import { AdminQuestionReportsController } from './controllers/admin-question-reports.controller';
import { QuestionReportsController } from './controllers/question-reports.controller';
import { QuestionReportsRepository } from './repositories/question-reports.repository';
import { QuestionReportsService } from './services/question-reports.service';

/**
 * Question reports module (docs/06-backend/architecture.md §6) — the loop that
 * lets the people using the bank tell its editors what is wrong with it.
 */
@Module({
  controllers: [QuestionReportsController, AdminQuestionReportsController],
  providers: [QuestionReportsService, QuestionReportsRepository],
})
export class QuestionReportsModule {}
