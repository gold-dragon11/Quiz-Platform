import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { TeacherOnly } from '../../auth/decorators/teacher-only.decorator';
import { CreateGroupDto } from '../dto/create-group.dto';
import { UpdateGroupDto } from '../dto/update-group.dto';
import { GroupsService } from '../services/groups.service';
import { GroupStudent, TeacherGroup } from '../types/group.types';

/**
 * A teacher's own groups (docs/02-domain/group.md).
 *
 * Every route is scoped to the caller: the service resolves each group by
 * (id, owner) and answers 404 when the pair does not match, so a teacher can
 * neither read nor probe for someone else's group.
 */
@TeacherOnly()
@Controller('teacher/groups')
export class TeacherGroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  /** POST /api/v1/teacher/groups — create a group in one subject. */
  @Post()
  async create(
    @CurrentUser('id') teacherId: string,
    @Body() dto: CreateGroupDto,
  ): Promise<TeacherGroup> {
    return this.groupsService.create(teacherId, dto);
  }

  /** GET /api/v1/teacher/groups — active groups first, then the archive. */
  @Get()
  async list(@CurrentUser('id') teacherId: string): Promise<TeacherGroup[]> {
    return this.groupsService.listForTeacher(teacherId);
  }

  /** GET /api/v1/teacher/groups/:groupId */
  @Get(':groupId')
  async findOne(
    @CurrentUser('id') teacherId: string,
    @Param('groupId', ParseUUIDPipe) groupId: string,
  ): Promise<TeacherGroup> {
    return this.groupsService.findForTeacher(teacherId, groupId);
  }

  /** PATCH /api/v1/teacher/groups/:groupId — rename. */
  @Patch(':groupId')
  async rename(
    @CurrentUser('id') teacherId: string,
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Body() dto: UpdateGroupDto,
  ): Promise<TeacherGroup> {
    return this.groupsService.rename(teacherId, groupId, dto);
  }

  /**
   * POST /api/v1/teacher/groups/:groupId/archive — closes the group to new
   * members. Idempotent: archiving an archive is not an error.
   */
  @Post(':groupId/archive')
  async archive(
    @CurrentUser('id') teacherId: string,
    @Param('groupId', ParseUUIDPipe) groupId: string,
  ): Promise<TeacherGroup> {
    return this.groupsService.archive(teacherId, groupId);
  }

  /**
   * POST /api/v1/teacher/groups/:groupId/invite-code — issues a new code and
   * retires the old one immediately.
   */
  @Post(':groupId/invite-code')
  async regenerateInviteCode(
    @CurrentUser('id') teacherId: string,
    @Param('groupId', ParseUUIDPipe) groupId: string,
  ): Promise<TeacherGroup> {
    return this.groupsService.regenerateInviteCode(teacherId, groupId);
  }

  /** GET /api/v1/teacher/groups/:groupId/students — current roster. */
  @Get(':groupId/students')
  async listStudents(
    @CurrentUser('id') teacherId: string,
    @Param('groupId', ParseUUIDPipe) groupId: string,
  ): Promise<GroupStudent[]> {
    return this.groupsService.listStudents(teacherId, groupId);
  }

  /**
   * DELETE /api/v1/teacher/groups/:groupId/students/:studentId — closes the
   * membership. The student keeps their account and their entire history.
   */
  @Delete(':groupId/students/:studentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeStudent(
    @CurrentUser('id') teacherId: string,
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Param('studentId', ParseUUIDPipe) studentId: string,
  ): Promise<void> {
    await this.groupsService.removeStudent(teacherId, groupId, studentId);
  }
}
