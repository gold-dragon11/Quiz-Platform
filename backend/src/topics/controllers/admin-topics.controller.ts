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
import { CreateTopicDto } from '../dto/create-topic.dto';
import { ListTopicsQueryDto } from '../dto/list-topics-query.dto';
import { UpdateTopicDto } from '../dto/update-topic.dto';
import {
  TopicRecord,
  TopicTranslationRecord,
} from '../repositories/topics.repository';
import { TopicsService } from '../services/topics.service';
import { PaginatedTopics } from '../types/paginated-topics.type';

/**
 * Administrative topic management (docs/04-api/admin.md §5).
 *
 * Every route is administrator-only: @AdminOnly() applies JwtAuthGuard and
 * RolesGuard controller-wide — unauthenticated requests get 401,
 * non-administrators get 403 (docs/04-api/admin.md §3).
 */
@AdminOnly()
@Controller('admin/topics')
export class AdminTopicsController {
  constructor(private readonly topicsService: TopicsService) {}

  /** GET /api/v1/admin/topics — paginated, filterable, sortable list. */
  @Get()
  async list(@Query() query: ListTopicsQueryDto): Promise<PaginatedTopics> {
    return this.topicsService.list(query);
  }

  /** POST /api/v1/admin/topics — creates a topic (default locale only). */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createTopicDto: CreateTopicDto): Promise<TopicRecord> {
    return this.topicsService.create(createTopicDto);
  }

  /**
   * PUT /api/v1/admin/topics/{id} — merge-updates the topic, or upserts the
   * TopicTranslation when `locale` is supplied.
   */
  @Put(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateTopicDto: UpdateTopicDto,
  ): Promise<TopicRecord | TopicTranslationRecord> {
    return this.topicsService.update(id, updateTopicDto);
  }

  /** DELETE /api/v1/admin/topics/{id} — soft delete, responds 204. */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.topicsService.remove(id);
  }
}
