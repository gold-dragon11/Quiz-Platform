import { Controller, Get } from '@nestjs/common';
import { AdminOnly } from '../../auth/decorators/admin-only.decorator';
import { MetricsService } from '../services/metrics.service';
import type { PlatformMetrics } from '../metrics.types';

/**
 * How the platform is doing, for the person who runs it
 * (docs/01-prd/admin-panel.md §8).
 *
 * Administrator-only, controller-wide: @AdminOnly() applies JwtAuthGuard and
 * RolesGuard, so an unauthenticated request gets 401 and a learner or teacher
 * 403. That matters more here than on the content routes — a learner must not
 * be able to read how many people the platform has, and a teacher's own
 * analytics are about their group, not about everybody.
 */
@AdminOnly()
@Controller('admin/metrics')
export class AdminMetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  /**
   * GET /api/v1/admin/metrics — one read for the whole overview.
   *
   * A single endpoint rather than one per panel: every figure comes from the
   * same instant, so nothing on the screen can disagree with the rest of it,
   * and the page makes one request instead of seven.
   */
  @Get()
  async overview(): Promise<PlatformMetrics> {
    return this.metricsService.overview();
  }
}
