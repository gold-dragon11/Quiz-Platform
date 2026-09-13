import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { QuizSessionMetadata } from '../../quiz/types/quiz.types';
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

  /**
   * POST /api/v1/assignments/:assignmentId/start — begin the work, or return
   * the session already in progress. From here the ordinary quiz routes take
   * over: the questions, the answers and the review are the same engine the
   * student already knows.
   */
  @Post(':assignmentId/start')
  @HttpCode(HttpStatus.OK)
  async start(
    @CurrentUser('id') studentId: string,
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
  ): Promise<QuizSessionMetadata> {
    return this.assignmentsService.start(studentId, assignmentId);
  }
}
