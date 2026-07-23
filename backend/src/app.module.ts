import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { AppConfigModule } from './config/config.module';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { SubjectsModule } from './subjects/subjects.module';
import { TopicsModule } from './topics/topics.module';

@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
    HealthModule,
    AuthModule,
    SubjectsModule,
    TopicsModule,
  ],
})
export class AppModule {}
