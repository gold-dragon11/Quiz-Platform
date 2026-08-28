import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { LocalizedThrottlerGuard } from './common/guards/localized-throttler.guard';
import { AppConfigModule } from './config/config.module';
import { AppConfig } from './config/configuration';
import { HealthModule } from './health/health.module';
import { LearningMaterialsModule } from './learning-materials/learning-materials.module';
import { PrismaModule } from './prisma/prisma.module';
import { QuestionsModule } from './questions/questions.module';
import { QuizModule } from './quiz/quiz.module';
import { QuizzesModule } from './quizzes/quizzes.module';
import { SettingsModule } from './settings/settings.module';
import { StatisticsModule } from './statistics/statistics.module';
import { SubjectsModule } from './subjects/subjects.module';
import { TopicsModule } from './topics/topics.module';
import { UsersModule } from './users/users.module';

/**
 * The throttler is registered globally so a new controller is protected by
 * default rather than by remembering to add a guard. The global allowance is
 * deliberately loose — it exists to stop scripted abuse, not to shape normal
 * traffic. Endpoints that cost money or guard credentials narrow it further
 * with `@Throttle` at the route.
 */
@Module({
  imports: [
    AppConfigModule,
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AppConfig, true>) => {
        const { enabled, ttl, limit } = configService.get('throttle', {
          infer: true,
        });
        return {
          throttlers: [{ ttl: ttl * 1000, limit }],
          skipIf: () => !enabled,
        };
      },
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    SubjectsModule,
    TopicsModule,
    QuestionsModule,
    LearningMaterialsModule,
    QuizModule,
    QuizzesModule,
    StatisticsModule,
    SettingsModule,
    UsersModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: LocalizedThrottlerGuard }],
})
export class AppModule {}
