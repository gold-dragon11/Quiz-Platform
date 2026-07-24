import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { AppConfigModule } from './config/config.module';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { QuestionsModule } from './questions/questions.module';
import { QuizModule } from './quiz/quiz.module';
import { SettingsModule } from './settings/settings.module';
import { StatisticsModule } from './statistics/statistics.module';
import { SubjectsModule } from './subjects/subjects.module';
import { TopicsModule } from './topics/topics.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
    HealthModule,
    AuthModule,
    SubjectsModule,
    TopicsModule,
    QuestionsModule,
    QuizModule,
    StatisticsModule,
    SettingsModule,
    UsersModule,
  ],
})
export class AppModule {}
