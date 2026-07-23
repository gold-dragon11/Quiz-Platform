import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PublicLocaleQueryDto } from '../dto/public-locale-query.dto';
import { SubjectsService } from '../services/subjects.service';
import { PublicSubject } from '../types/public-subject.type';

/**
 * Public subject catalog (docs/04-api/questions.md §4). Requires
 * authentication — any role; only administrators use the admin routes.
 */
@UseGuards(JwtAuthGuard)
@Controller('subjects')
export class PublicSubjectsController {
  constructor(private readonly subjectsService: SubjectsService) {}

  /**
   * GET /api/v1/subjects — published subjects, displayOrder ascending,
   * localized with fallback to the default locale.
   */
  @Get()
  async list(
    @Query() query: PublicLocaleQueryDto,
    @CurrentUser('id') userId: string,
  ): Promise<PublicSubject[]> {
    return this.subjectsService.listPublished(query.locale, userId);
  }
}
