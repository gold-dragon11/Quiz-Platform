import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { AdminOnly } from '../../auth/decorators/admin-only.decorator';
import { CreateQuestionDto } from '../dto/create-question.dto';
import { ListQuestionsQueryDto } from '../dto/list-questions-query.dto';
import { PublishQuestionDto } from '../dto/publish-question.dto';
import { UpdateQuestionDto } from '../dto/update-question.dto';
import {
  QuestionRecord,
  QuestionTranslationRecord,
} from '../repositories/questions.repository';
import { QuestionsService } from '../services/questions.service';
import { PaginatedQuestions } from '../types/paginated-questions.type';

/**
 * Administrative question management (docs/04-api/admin.md §6-7, §10).
 *
 * Every route is administrator-only: @AdminOnly() applies JwtAuthGuard and
 * RolesGuard controller-wide — unauthenticated requests get 401,
 * non-administrators get 403 (docs/04-api/admin.md §3).
 */
@AdminOnly()
@Controller('admin/questions')
export class AdminQuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  /**
   * GET /api/v1/admin/questions — paginated, filterable, sortable list.
   * Items include answer options and configuration: there is no
   * single-question endpoint, so the list is the editing source.
   */
  @Get()
  async list(
    @Query() query: ListQuestionsQueryDto,
  ): Promise<PaginatedQuestions> {
    return this.questionsService.list(query);
  }

  /**
   * POST /api/v1/admin/questions — creates a question with its answer
   * options (default locale only).
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createQuestionDto: CreateQuestionDto,
  ): Promise<QuestionRecord> {
    return this.questionsService.create(createQuestionDto);
  }

  /**
   * PUT /api/v1/admin/questions/{id} — merge-updates the question and its
   * option set, or upserts translations when `locale` is supplied.
   */
  @Put(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateQuestionDto: UpdateQuestionDto,
  ): Promise<QuestionRecord | QuestionTranslationRecord> {
    return this.questionsService.update(id, updateQuestionDto);
  }

  /**
   * PATCH /api/v1/admin/questions/{id}/publish — the only mutation of
   * publication state (docs/04-api/admin.md §10).
   */
  @Patch(':id/publish')
  async publish(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() publishQuestionDto: PublishQuestionDto,
  ): Promise<QuestionRecord> {
    return this.questionsService.setPublished(id, publishQuestionDto);
  }

  /** DELETE /api/v1/admin/questions/{id} — soft delete, responds 204. */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.questionsService.remove(id);
  }
}
