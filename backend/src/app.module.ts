import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { CatalogueModule } from './catalogue/catalogue.module';
import { LocalizedThrottlerGuard } from './common/guards/localized-throttler.guard';
import { AppConfigModule } from './config/config.module';
import { AppConfig } from './config/configuration';
import { JwtService } from '@nestjs/jwt';
import { byAddress, byPerson } from './common/throttle/request-trackers';
import { DuelsModule } from './duels/duels.module';
import { HealthModule } from './health/health.module';
import { LearningMaterialsModule } from './learning-materials/learning-materials.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PrismaModule } from './prisma/prisma.module';
import { QuestionReportsModule } from './question-reports/question-reports.module';
import { QuestionsModule } from './questions/questions.module';
import { QuizModule } from './quiz/quiz.module';
import { QuizzesModule } from './quizzes/quizzes.module';
import { SettingsModule } from './settings/settings.module';
import { StatisticsModule } from './statistics/statistics.module';
import { AssignmentsModule } from './assignments/assignments.module';
import { GroupsModule } from './groups/groups.module';
import { SubjectsModule } from './subjects/subjects.module';
import { TopicsModule } from './topics/topics.module';
import { UsersModule } from './users/users.module';

/**
 * Requests allowed from one client address per minute, whoever sends them. A
 * ceiling under the per-person allowance rather than a replacement for it:
 * sized for a class of about thirty-five on one network, each saving answers
 * and paging through a paper at once.
 */
const ADDRESS_LIMIT_PER_MINUTE = 600;

/**
 * The throttler is registered globally so a new controller is protected by
 * default rather than by remembering to add a guard. The global allowance is
 * deliberately loose — it exists to stop scripted abuse, not to shape normal
 * traffic. Endpoints that cost money or guard credentials narrow it further
 * with `@Throttle` at the route.
 *
 * Two named limits count every request. `default` is per person — the
 * verified user behind a bearer token, else the address — so one busy
 * classmate cannot spend the room's allowance. `address` is a ceiling per
 * client address for everything together (docs/06-backend/security.md §12).
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
        const jwt = new JwtService({
          secret: configService.get('jwt', { infer: true }).accessSecret,
        });
        return {
          throttlers: [
            {
              name: 'default',
              ttl: ttl * 1000,
              limit,
              getTracker: byPerson(jwt),
            },
            {
              name: 'address',
              ttl: 60_000,
              limit: ADDRESS_LIMIT_PER_MINUTE,
              getTracker: byAddress,
            },
          ],
          skipIf: () => !enabled,
        };
      },
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    CatalogueModule,
    SubjectsModule,
    TopicsModule,
    QuestionsModule,
    QuestionReportsModule,
    DuelsModule,
    NotificationsModule,
    LearningMaterialsModule,
    GroupsModule,
    AssignmentsModule,
    QuizModule,
    QuizzesModule,
    StatisticsModule,
    SettingsModule,
    UsersModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: LocalizedThrottlerGuard }],
})
export class AppModule {}
