import {
  Body,
  Controller,
  Delete,
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
import { JoinGroupDto } from '../dto/join-group.dto';
import { GroupsService } from '../services/groups.service';
import { JoinedGroup, StudentGroup } from '../types/group.types';

/**
 * Groups from the student's side (docs/02-domain/group.md).
 *
 * Authentication only, no role requirement: a group is something a student
 * joins, and nothing here exposes anyone else's data.
 */
@UseGuards(JwtAuthGuard)
@Controller('groups')
export class StudentGroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  /**
   * POST /api/v1/groups/join — join by the code the teacher shared.
   * Idempotent: joining a group twice returns the group rather than an error.
   */
  @Post('join')
  @HttpCode(HttpStatus.OK)
  async join(
    @CurrentUser('id') studentId: string,
    @Body() dto: JoinGroupDto,
  ): Promise<JoinedGroup> {
    return this.groupsService.join(studentId, dto);
  }

  /** GET /api/v1/groups — the groups this student currently belongs to. */
  @Get()
  async list(@CurrentUser('id') studentId: string): Promise<StudentGroup[]> {
    return this.groupsService.listForStudent(studentId);
  }

  /**
   * DELETE /api/v1/groups/:groupId/membership — leave. The membership closes;
   * the student's own statistics and mistake history are untouched.
   */
  @Delete(':groupId/membership')
  @HttpCode(HttpStatus.NO_CONTENT)
  async leave(
    @CurrentUser('id') studentId: string,
    @Param('groupId', ParseUUIDPipe) groupId: string,
  ): Promise<void> {
    await this.groupsService.leave(studentId, groupId);
  }
}
