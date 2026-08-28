import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { LearningMaterialsService } from '../services/learning-materials.service';
import { PublicLearningMaterial } from '../types/public-learning-material.type';

/**
 * Public learning material access (docs/04-api/learning-materials.md §4).
 * Requires authentication — any role. Read-only for learners.
 */
@UseGuards(JwtAuthGuard)
@Controller('topics/:topicId/material')
export class PublicLearningMaterialsController {
  constructor(
    private readonly learningMaterialsService: LearningMaterialsService,
  ) {}

  /**
   * GET /api/v1/topics/{topicId}/material — the published material for this
   * topic. No material, an unpublished one, and an unpublished ancestor are
   * all the same 404, so nothing about unpublished content leaks.
   */
  @Get()
  async findForTopic(
    @Param('topicId', ParseUUIDPipe) topicId: string,
  ): Promise<PublicLearningMaterial> {
    return this.learningMaterialsService.findPublishedForTopic(topicId);
  }
}
