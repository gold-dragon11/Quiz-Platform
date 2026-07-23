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
import { ListPublicQuestionsQueryDto } from '../dto/list-public-questions-query.dto';
import { QuestionsService } from '../services/questions.service';
import { PaginatedPublicQuestions } from '../types/public-question.type';

/**
 * Public question delivery (docs/04-api/questions.md §5-§8). Requires
 * authentication — any role. Correct answers are never exposed
 * (docs/04-api/questions.md §14).
 */
@UseGuards(JwtAuthGuard)
@Controller('topics/:topicId/questions')
export class PublicQuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  /**
   * GET /api/v1/topics/{topicId}/questions — published questions of a fully
   * published topic (ancestor chain included), newest first, paginated,
   * localized with fallback. An unknown, unpublished, or deleted topic —
   * or one under an unpublished subject — is 404.
   */
  @Get()
  async list(
    @Param('topicId', ParseUUIDPipe) topicId: string,
    @Query() query: ListPublicQuestionsQueryDto,
    @CurrentUser('id') userId: string,
  ): Promise<PaginatedPublicQuestions> {
    return this.questionsService.listPublishedForTopic(topicId, query, userId);
  }
}
