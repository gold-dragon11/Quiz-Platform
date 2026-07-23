import { Module } from '@nestjs/common';
import { AdminSubjectsController } from './controllers/admin-subjects.controller';
import { SubjectsRepository } from './repositories/subjects.repository';
import { SubjectsService } from './services/subjects.service';

/**
 * Subjects module (docs/06-backend/architecture.md §6) — owns the Subject
 * domain: administrative CRUD now, public read endpoints in a later phase.
 * Topics, Questions, and Quizzes will follow the same structure.
 */
@Module({
  controllers: [AdminSubjectsController],
  providers: [SubjectsService, SubjectsRepository],
  exports: [SubjectsService],
})
export class SubjectsModule {}
