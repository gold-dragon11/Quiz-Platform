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
import { CreateSubjectDto } from '../dto/create-subject.dto';
import { ListSubjectsQueryDto } from '../dto/list-subjects-query.dto';
import { UpdateSubjectDto } from '../dto/update-subject.dto';
import {
  SubjectRecord,
  SubjectTranslationRecord,
} from '../repositories/subjects.repository';
import { SubjectsService } from '../services/subjects.service';
import { PaginatedSubjects } from '../types/paginated-subjects.type';

/**
 * Administrative subject management (docs/04-api/admin.md §4).
 *
 * Every route is administrator-only: @AdminOnly() applies JwtAuthGuard and
 * RolesGuard controller-wide — unauthenticated requests get 401,
 * non-administrators get 403 (docs/04-api/admin.md §3).
 */
@AdminOnly()
@Controller('admin/subjects')
export class AdminSubjectsController {
  constructor(private readonly subjectsService: SubjectsService) {}

  /** GET /api/v1/admin/subjects — paginated, filterable, sortable list. */
  @Get()
  async list(@Query() query: ListSubjectsQueryDto): Promise<PaginatedSubjects> {
    return this.subjectsService.list(query);
  }

  /** POST /api/v1/admin/subjects — creates a subject (default locale only). */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createSubjectDto: CreateSubjectDto,
  ): Promise<SubjectRecord> {
    return this.subjectsService.create(createSubjectDto);
  }

  /**
   * PUT /api/v1/admin/subjects/{id} — merge-updates the subject, or upserts
   * the SubjectTranslation when `locale` is supplied.
   */
  @Put(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateSubjectDto: UpdateSubjectDto,
  ): Promise<SubjectRecord | SubjectTranslationRecord> {
    return this.subjectsService.update(id, updateSubjectDto);
  }

  /** DELETE /api/v1/admin/subjects/{id} — soft delete, responds 204. */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.subjectsService.remove(id);
  }
}
