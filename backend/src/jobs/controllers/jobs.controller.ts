import {
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { DemoService } from '../../demo/demo.service';
import { CronSecretGuard } from '../guards/cron-secret.guard';
import { HourlySweepReport, JobsService } from '../services/jobs.service';

/**
 * The scheduler's door (docs/08-development/deployment.md §17.7).
 *
 * Called from outside because the API cannot keep a clock of its own: on the
 * free hosting tier the process is stopped between requests, and a timer in a
 * stopped process never fires.
 */
@UseGuards(CronSecretGuard)
@Controller('jobs')
export class JobsController {
  constructor(
    private readonly jobsService: JobsService,
    private readonly demoService: DemoService,
  ) {}

  /** POST /api/v1/jobs/hourly */
  @Post('hourly')
  @HttpCode(HttpStatus.OK)
  runHourly(): Promise<HourlySweepReport> {
    return this.jobsService.runHourly();
  }

  /**
   * POST /api/v1/jobs/demo-reset — rebuilds the public demo (§17.9).
   *
   * 202 and not 200: the rebuild takes about a minute against production, so
   * it runs after the response. `started: false` means one is already running.
   * A failure is logged and reported to Sentry rather than returned.
   */
  @Post('demo-reset')
  @HttpCode(HttpStatus.ACCEPTED)
  startDemoReset(): { started: boolean } {
    return { started: this.demoService.startInBackground() };
  }
}
