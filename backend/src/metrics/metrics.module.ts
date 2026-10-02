import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminMetricsController } from './controllers/admin-metrics.controller';
import { MetricsService } from './services/metrics.service';

/**
 * Platform metrics for the administrator (docs/01-prd/admin-panel.md §8).
 *
 * Reads only, and owns no rules: every figure is derived from tables other
 * modules fill. `real-account.ts` is exported by being imported directly —
 * the digest in `owner-alerts` shares it so the two never disagree about how
 * many accounts exist.
 */
@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [AdminMetricsController],
  providers: [MetricsService],
})
export class MetricsModule {}
