import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PublicLocaleQueryDto } from '../../subjects/dto/public-locale-query.dto';
import { TopicsService } from '../services/topics.service';
import { PublicTopic } from '../types/public-topic.type';

/**
 * Public topic catalog (docs/04-api/questions.md §4). Requires
 * authentication — any role.
 */
@UseGuards(JwtAuthGuard)
@Controller('subjects/:subjectId/topics')
export class PublicTopicsController {
  constructor(private readonly topicsService: TopicsService) {}

  /**
   * GET /api/v1/subjects/{subjectId}/topics — published topics of a
   * published subject, displayOrder ascending, localized with fallback.
   * An unknown, unpublished, or deleted subject is 404.
   */
  @Get()
  async list(
    @Param('subjectId', ParseUUIDPipe) subjectId: string,
    @Query() query: PublicLocaleQueryDto,
    @CurrentUser('id') userId: string,
  ): Promise<PublicTopic[]> {
    return this.topicsService.listPublishedForSubject(
      subjectId,
      query.locale,
      userId,
    );
  }
}
