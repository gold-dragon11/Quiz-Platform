import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { LearningMaterialsService } from '../services/learning-materials.service';
import { PublicLearningMaterialSummary } from '../types/public-learning-material-summary.type';

/**
 * Public per-subject material listing (docs/04-api/learning-materials.md §4).
 * Separate from the per-topic controller because it hangs off a different
 * resource path; both are read-only and require authentication.
 */
@UseGuards(JwtAuthGuard)
@Controller('subjects/:subjectId/materials')
export class PublicSubjectMaterialsController {
  constructor(
    private readonly learningMaterialsService: LearningMaterialsService,
  ) {}

  /**
   * GET /api/v1/subjects/{subjectId}/materials — published materials of the
   * subject, in display order, without their bodies. Lets the topic list show
   * which topics have a material in one request instead of one per topic.
   */
  @Get()
  async listForSubject(
    @Param('subjectId', ParseUUIDPipe) subjectId: string,
  ): Promise<PublicLearningMaterialSummary[]> {
    return this.learningMaterialsService.findPublishedForSubject(subjectId);
  }
}
