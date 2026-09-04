import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from '@nestjs/common';
import { AdminOnly } from '../../auth/decorators/admin-only.decorator';
import { ListUsersQueryDto } from '../dto/list-users-query.dto';
import { UpdateUserRoleDto } from '../dto/update-user-role.dto';
import { AdminUserRecord } from '../repositories/users.repository';
import {
  AdminUsersService,
  PaginatedAdminUsers,
} from '../services/admin-users.service';

/**
 * The account directory and the one role decision an administrator makes.
 *
 * Administrator-only, controller-wide: @AdminOnly() applies JwtAuthGuard and
 * RolesGuard, so unauthenticated requests get 401 and everyone else 403.
 */
@AdminOnly()
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  /** GET /api/v1/admin/users — searchable, paginated account directory. */
  @Get()
  async list(@Query() query: ListUsersQueryDto): Promise<PaginatedAdminUsers> {
    return this.adminUsersService.list(query);
  }

  /**
   * PATCH /api/v1/admin/users/:userId/role — moves an account between USER and
   * TEACHER. Administrator accounts are refused, and ADMIN is not an accepted
   * target: that role is granted where the platform is deployed.
   */
  @Patch(':userId/role')
  async setRole(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: UpdateUserRoleDto,
  ): Promise<AdminUserRecord> {
    return this.adminUsersService.setRole(userId, dto);
  }
}
