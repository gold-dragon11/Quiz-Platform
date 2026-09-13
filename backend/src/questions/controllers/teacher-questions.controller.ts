import { Controller, Get, Query } from '@nestjs/common';
import { TeacherOnly } from '../../auth/decorators/teacher-only.decorator';
import { ListTeacherQuestionsQueryDto } from '../dto/list-teacher-questions-query.dto';
import { QuestionsService } from '../services/questions.service';
import { PaginatedQuestions } from '../types/paginated-questions.type';

/**
 * The question bank, as a teacher reads it (`@TeacherOnly()`).
 *
 * Unlike every other question surface, this one carries the correct answers
 * and the explanations. That is deliberate and it is the whole reason the
 * endpoint exists: a tutor choosing questions for homework has to judge
 * whether a question is well posed and how hard it really is, and neither is
 * visible from the stem alone. The delivery endpoint students use withholds
 * both, and must keep withholding them.
 *
 * The trade this makes: any teacher can read the entire bank with its keys.
 * That is acceptable precisely because the role is not self-service — an
 * administrator grants it one account at a time (docs/04-api/admin.md §19).
 * If teachers ever become self-registering, this endpoint is the first thing
 * that has to change.
 *
 * Only published questions. Drafts belong to whoever is writing them.
 */
@TeacherOnly()
@Controller('teacher/questions')
export class TeacherQuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  /** GET /api/v1/teacher/questions — paginated, filterable, with answers. */
  @Get()
  async list(
    @Query() query: ListTeacherQuestionsQueryDto,
  ): Promise<PaginatedQuestions> {
    return this.questionsService.listForTeacher(query);
  }
}
