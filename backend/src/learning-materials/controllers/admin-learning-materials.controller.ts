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
import { CreateLearningMaterialDto } from '../dto/create-learning-material.dto';
import { ListLearningMaterialsQueryDto } from '../dto/list-learning-materials-query.dto';
import { UpdateLearningMaterialDto } from '../dto/update-learning-material.dto';
import { LearningMaterialRecord } from '../repositories/learning-materials.repository';
import { LearningMaterialsService } from '../services/learning-materials.service';
import { PaginatedLearningMaterials } from '../types/paginated-learning-materials.type';

/**
 * Administrative learning material management
 * (docs/04-api/learning-materials.md §5).
 *
 * Every route is administrator-only: @AdminOnly() applies JwtAuthGuard and
 * RolesGuard controller-wide — unauthenticated requests get 401,
 * non-administrators get 403 (docs/04-api/admin.md §3).
 */
@AdminOnly()
@Controller('admin/learning-materials')
export class AdminLearningMaterialsController {
  constructor(
    private readonly learningMaterialsService: LearningMaterialsService,
  ) {}

  /** GET /api/v1/admin/learning-materials — paginated, filterable list. */
  @Get()
  async list(
    @Query() query: ListLearningMaterialsQueryDto,
  ): Promise<PaginatedLearningMaterials> {
    return this.learningMaterialsService.list(query);
  }

  /** POST /api/v1/admin/learning-materials — creates an unpublished material. */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createDto: CreateLearningMaterialDto,
  ): Promise<LearningMaterialRecord> {
    return this.learningMaterialsService.create(createDto);
  }

  /** PUT /api/v1/admin/learning-materials/{id} — merge-updates the material. */
  @Put(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateLearningMaterialDto,
  ): Promise<LearningMaterialRecord> {
    return this.learningMaterialsService.update(id, updateDto);
  }

  /** DELETE /api/v1/admin/learning-materials/{id} — soft delete, 204. */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.learningMaterialsService.remove(id);
  }
}
