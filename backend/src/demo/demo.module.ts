import { Module } from '@nestjs/common';
import { AssignmentsModule } from '../assignments/assignments.module';
import { AuthModule } from '../auth/auth.module';
import { DuelsModule } from '../duels/duels.module';
import { GroupsModule } from '../groups/groups.module';
import { QuizModule } from '../quiz/quiz.module';
import { DemoService } from './demo.service';

/**
 * The public demo (docs/08-development/deployment.md §17.9). Owns no rules of
 * its own: it drives the real services, and only decides what story to tell.
 */
@Module({
  imports: [
    AuthModule,
    QuizModule,
    GroupsModule,
    AssignmentsModule,
    DuelsModule,
  ],
  providers: [DemoService],
  exports: [DemoService],
})
export class DemoModule {}
