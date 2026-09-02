import { Module } from '@nestjs/common';
import { StudentGroupsController } from './controllers/student-groups.controller';
import { TeacherGroupsController } from './controllers/teacher-groups.controller';
import { GroupsRepository } from './repositories/groups.repository';
import { GroupsService } from './services/groups.service';

/**
 * Groups module (docs/06-backend/architecture.md §6) — owns the Group and
 * GroupMembership domain: a teacher's roster and the code students join by.
 *
 * Nothing in the student product depends on this module. A student who never
 * joins a group sees exactly the application that shipped before it existed.
 */
@Module({
  controllers: [TeacherGroupsController, StudentGroupsController],
  providers: [GroupsService, GroupsRepository],
  exports: [GroupsService, GroupsRepository],
})
export class GroupsModule {}
