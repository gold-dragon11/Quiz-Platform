import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { TeacherOnly } from '../../auth/decorators/teacher-only.decorator';
import { CreateAssignmentDto } from '../dto/create-assignment.dto';
import { UpdateAssignmentDto } from '../dto/update-assignment.dto';
import { AssignmentsService } from '../services/assignments.service';
import { TeacherAssignment } from '../types/assignment.types';

/**
 * Issuing and managing assignments (docs/02-domain/assignment.md).
 *
 * Creation hangs off the group, because a group is what an assignment is issued
 * into. Everything afterwards addresses the assignment directly — by then it
 * has its own identity and its own frozen recipient list.
 */
@TeacherOnly()
@Controller('teacher')
export class TeacherAssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  /**
   * POST /api/v1/teacher/groups/:groupId/assignments — issue an assignment.
   * The question list and the recipients are frozen at this moment.
   */
  @Post('groups/:groupId/assignments')
  async create(
    @CurrentUser('id') teacherId: string,
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Body() dto: CreateAssignmentDto,
  ): Promise<TeacherAssignment> {
    return this.assignmentsService.create(teacherId, groupId, dto);
  }

  /** GET /api/v1/teacher/groups/:groupId/assignments — newest deadline first. */
  @Get('groups/:groupId/assignments')
  async listForGroup(
    @CurrentUser('id') teacherId: string,
    @Param('groupId', ParseUUIDPipe) groupId: string,
  ): Promise<TeacherAssignment[]> {
    return this.assignmentsService.listForGroup(teacherId, groupId);
  }

  /** GET /api/v1/teacher/assignments/:assignmentId */
  @Get('assignments/:assignmentId')
  async findOne(
    @CurrentUser('id') teacherId: string,
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
  ): Promise<TeacherAssignment> {
    return this.assignmentsService.findForTeacher(teacherId, assignmentId);
  }

  /**
   * PATCH /api/v1/teacher/assignments/:assignmentId — title, description and
   * deadline. The question list and the recipients are not editable.
   */
  @Patch('assignments/:assignmentId')
  async update(
    @CurrentUser('id') teacherId: string,
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
    @Body() dto: UpdateAssignmentDto,
  ): Promise<TeacherAssignment> {
    return this.assignmentsService.update(teacherId, assignmentId, dto);
  }
}
