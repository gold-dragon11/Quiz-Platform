import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { StatisticsModule } from '../statistics/statistics.module';
import { UsersController } from './controllers/users.controller';
import { UsersRepository } from './repositories/users.repository';
import { UsersService } from './services/users.service';

/**
 * Users module (docs/06-backend/architecture.md §6) — owns the user account,
 * Profile, and Avatar surfaces plus the public profile. Consumes Statistics
 * for the public-profile progress subset and AuthService for password change
 * and account deletion (which own all credential/session logic), each through
 * its public service interface only. Settings are owned by the Settings
 * module.
 */
@Module({
  imports: [StatisticsModule, AuthModule],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository],
})
export class UsersModule {}
