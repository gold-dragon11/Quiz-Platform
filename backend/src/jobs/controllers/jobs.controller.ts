import {
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
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
  constructor(private readonly jobsService: JobsService) {}

  /** POST /api/v1/jobs/hourly */
  @Post('hourly')
  @HttpCode(HttpStatus.OK)
  runHourly(): Promise<HourlySweepReport> {
    return this.jobsService.runHourly();
  }
}
