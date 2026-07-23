import { Module } from '@nestjs/common';
import { SettingsModule } from '../settings/settings.module';
import { AdminSubjectsController } from './controllers/admin-subjects.controller';
import { PublicSubjectsController } from './controllers/public-subjects.controller';
import { SubjectsRepository } from './repositories/subjects.repository';
import { SubjectsService } from './services/subjects.service';

/**
 * Subjects module (docs/06-backend/architecture.md §6) — owns the Subject
 * domain: administrative CRUD and the public catalog. Topics, Questions,
 * and Quizzes follow the same structure.
 */
@Module({
  imports: [SettingsModule],
  controllers: [AdminSubjectsController, PublicSubjectsController],
  providers: [SubjectsService, SubjectsRepository],
  exports: [SubjectsService],
})
export class SubjectsModule {}
