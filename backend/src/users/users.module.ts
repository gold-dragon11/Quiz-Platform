import { Module } from '@nestjs/common';
import { StatisticsModule } from '../statistics/statistics.module';
import { UsersController } from './controllers/users.controller';
import { UsersRepository } from './repositories/users.repository';
import { UsersService } from './services/users.service';

/**
 * Users module (docs/06-backend/architecture.md §6) — owns the user Profile
 * and Avatar surfaces plus the public profile. Consumes Statistics only
 * through its public service for the public-profile progress subset. Settings
 * are owned by the Settings module.
 */
@Module({
  imports: [StatisticsModule],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository],
})
export class UsersModule {}
