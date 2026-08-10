import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { HealthService, HealthStatus } from './health.service';

/**
 * Exempt from rate limiting. The hosting platform polls this endpoint on a
 * fixed schedule to decide whether the instance is alive; a 429 would read as
 * an unhealthy instance and could take a healthy deployment out of rotation.
 */
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  async check(): Promise<HealthStatus> {
    const result = await this.healthService.check();

    if (result.status === 'error') {
      throw new ServiceUnavailableException(result);
    }

    return result;
  }
}
