import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { AdminOnly } from '../../auth/decorators/admin-only.decorator';
import { CreateQuizDto } from '../dto/create-quiz.dto';
import { ListQuizzesQueryDto } from '../dto/list-quizzes-query.dto';
import { UpdateQuizDto } from '../dto/update-quiz.dto';
import { QuizRecord } from '../repositories/quiz-config.repository';
import { QuizConfigService } from '../services/quiz-config.service';
import { PaginatedQuizzes } from '../types/paginated-quizzes.type';

/**
 * Administrative quiz-configuration management (docs/04-api/admin.md §8).
 *
 * Every route is administrator-only: @AdminOnly() applies JwtAuthGuard and
 * RolesGuard controller-wide — unauthenticated requests get 401,
 * non-administrators get 403 (docs/04-api/admin.md §3).
 */
@AdminOnly()
@Controller('admin/quizzes')
export class AdminQuizzesController {
  constructor(private readonly quizConfigService: QuizConfigService) {}

  /** GET /api/v1/admin/quizzes — paginated, filterable, sortable list. */
  @Get()
  async list(@Query() query: ListQuizzesQueryDto): Promise<PaginatedQuizzes> {
    return this.quizConfigService.list(query);
  }

  /** POST /api/v1/admin/quizzes — creates a reusable quiz configuration. */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createQuizDto: CreateQuizDto): Promise<QuizRecord> {
    return this.quizConfigService.create(createQuizDto);
  }

  /** PUT /api/v1/admin/quizzes/{id} — merge-updates a quiz configuration. */
  @Put(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateQuizDto: UpdateQuizDto,
  ): Promise<QuizRecord> {
    return this.quizConfigService.update(id, updateQuizDto);
  }

  /** DELETE /api/v1/admin/quizzes/{id} — soft delete, responds 204. */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.quizConfigService.remove(id);
  }
}
