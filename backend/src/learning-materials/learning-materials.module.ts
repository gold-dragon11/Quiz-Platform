import { Module } from '@nestjs/common';
import { SubjectsModule } from '../subjects/subjects.module';
import { TopicsModule } from '../topics/topics.module';
import { AdminLearningMaterialsController } from './controllers/admin-learning-materials.controller';
import { PublicLearningMaterialsController } from './controllers/public-learning-materials.controller';
import { PublicSubjectMaterialsController } from './controllers/public-subject-materials.controller';
import { LearningMaterialsRepository } from './repositories/learning-materials.repository';
import { LearningMaterialsService } from './services/learning-materials.service';

/**
 * Learning Materials module (docs/06-backend/architecture.md §6) — owns the
 * study notes that accompany quizzes. Depends on Subjects and Topics only
 * through their public service interfaces, to validate the parent subject and
 * that a referenced topic belongs to it (docs/06-backend/architecture.md §11).
 */
@Module({
  imports: [SubjectsModule, TopicsModule],
  controllers: [
    AdminLearningMaterialsController,
    PublicLearningMaterialsController,
    PublicSubjectMaterialsController,
  ],
  providers: [LearningMaterialsService, LearningMaterialsRepository],
  exports: [LearningMaterialsService],
})
export class LearningMaterialsModule {}
