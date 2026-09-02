import { Module } from '@nestjs/common';
import { GroupsModule } from '../groups/groups.module';
import { QuizModule } from '../quiz/quiz.module';
import { StudentAssignmentsController } from './controllers/student-assignments.controller';
import { TeacherReviewController } from './controllers/teacher-review.controller';
import { TeacherAssignmentsController } from './controllers/teacher-assignments.controller';
import { AssignmentsRepository } from './repositories/assignments.repository';
import { ReviewRepository } from './repositories/review.repository';
import { AssignmentsService } from './services/assignments.service';
import { QuestionSelectionService } from './services/question-selection.service';
import { ReviewService } from './services/review.service';

/**
 * Assignments module (docs/06-backend/architecture.md §6).
 *
 * Depends on GroupsModule for one thing only: proving that the group belongs
 * to the teacher and reading its current roster. Ownership is checked here on
 * every route rather than assumed from the URL.
 */
@Module({
  imports: [GroupsModule, QuizModule],
  controllers: [
    TeacherAssignmentsController,
    TeacherReviewController,
    StudentAssignmentsController,
  ],
  providers: [
    AssignmentsService,
    AssignmentsRepository,
    QuestionSelectionService,
    ReviewService,
    ReviewRepository,
  ],
  exports: [AssignmentsService],
})
export class AssignmentsModule {}
