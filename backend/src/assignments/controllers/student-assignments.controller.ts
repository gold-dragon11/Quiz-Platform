import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AssignmentsService } from '../services/assignments.service';
import { StudentAssignment } from '../types/assignment.types';

/**
 * A student's homework (docs/02-domain/assignment.md §7).
 *
 * Neither route returns the questions. An assignment a student has not started
 * is a task with a deadline, not a paper to read ahead of time — the questions
 * arrive with the session, where the existing quiz engine already withholds the
 * correct answers.
 */
@UseGuards(JwtAuthGuard)
@Controller('assignments')
export class StudentAssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  /**
   * GET /api/v1/assignments — everything issued to this student, across every
   * group, nearest deadline first.
   */
  @Get()
  async list(
    @CurrentUser('id') studentId: string,
  ): Promise<StudentAssignment[]> {
    return this.assignmentsService.listForStudent(studentId);
  }

  /** GET /api/v1/assignments/:assignmentId */
  @Get(':assignmentId')
  async findOne(
    @CurrentUser('id') studentId: string,
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
  ): Promise<StudentAssignment> {
    return this.assignmentsService.findForStudent(studentId, assignmentId);
  }
}
