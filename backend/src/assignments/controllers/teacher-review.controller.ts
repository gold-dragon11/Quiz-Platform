import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { TeacherOnly } from '../../auth/decorators/teacher-only.decorator';
import { ReviewService } from '../services/review.service';
import {
  GroupAnalytics,
  QuestionBreakdownRow,
  StudentProfile,
  SubmissionRow,
} from '../types/review.types';

/**
 * What a teacher opens before the next lesson (docs/02-domain/group.md §6).
 *
 * Every figure here is computed from assignments, which is what keeps the
 * time-bounded access rule structural: an assignment's recipient list was
 * frozen when it was issued, so these queries can only ever surface work this
 * teacher actually set.
 */
@TeacherOnly()
@Controller('teacher')
export class TeacherReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  /**
   * GET /api/v1/teacher/assignments/:assignmentId/submissions — who handed in
   * what. Students who have left the group are still listed: they were given
   * the work, and their results are part of what happened.
   */
  @Get('assignments/:assignmentId/submissions')
  async submissions(
    @CurrentUser('id') teacherId: string,
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
  ): Promise<SubmissionRow[]> {
    return this.reviewService.submissions(teacherId, assignmentId);
  }

  /**
   * GET /api/v1/teacher/assignments/:assignmentId/questions — the paper,
   * question by question, with how many got each one right.
   */
  @Get('assignments/:assignmentId/questions')
  async questions(
    @CurrentUser('id') teacherId: string,
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
  ): Promise<QuestionBreakdownRow[]> {
    return this.reviewService.questionBreakdown(teacherId, assignmentId);
  }

  /**
   * GET /api/v1/teacher/groups/:groupId/students/:studentId — one student,
   * built only from work set in this group.
   */
  @Get('groups/:groupId/students/:studentId')
  async studentProfile(
    @CurrentUser('id') teacherId: string,
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Param('studentId', ParseUUIDPipe) studentId: string,
  ): Promise<StudentProfile> {
    return this.reviewService.studentProfile(teacherId, groupId, studentId);
  }

  /**
   * GET /api/v1/teacher/groups/:groupId/analytics — the group's weakest topics,
   * worst first. This is the list the MISTAKES selection mode draws from.
   */
  @Get('groups/:groupId/analytics')
  async analytics(
    @CurrentUser('id') teacherId: string,
    @Param('groupId', ParseUUIDPipe) groupId: string,
  ): Promise<GroupAnalytics> {
    return this.reviewService.groupAnalytics(teacherId, groupId);
  }
}
