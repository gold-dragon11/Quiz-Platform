import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AccountStatus, UserRole } from '@prisma/client';
import { ListUsersQueryDto } from '../dto/list-users-query.dto';
import { UpdateUserRoleDto } from '../dto/update-user-role.dto';
import {
  AdminUserRecord,
  UsersRepository,
} from '../repositories/users.repository';

const USER_NOT_FOUND_MESSAGE = 'Користувача не знайдено.';
const ADMIN_UNTOUCHABLE_MESSAGE =
  'Роль адміністратора змінюється не тут. Це робиться там, де розгорнуто платформу.';
const DELETED_ACCOUNT_MESSAGE =
  'Обліковий запис видалено — роль змінювати нема кому.';

/**
 * A page of the administrator's user directory, in the pagination envelope
 * every other admin collection uses (docs/04-api/admin.md §12).
 */
export interface PaginatedAdminUsers {
  items: AdminUserRecord[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

/**
 * The one thing that turns an ordinary account into a teacher.
 *
 * There is no self-service path to `TEACHER` on purpose. A tutor's account
 * can read a whole group's mistakes, so handing the role out on a checkbox at
 * registration would mean anybody could watch anybody who joined their group.
 * An administrator deciding it, one account at a time, is the smallest control
 * that makes that meaningful — and it is honest about what this is: a platform
 * where tutors are vetted by hand.
 */
@Injectable()
export class AdminUsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async list(query: ListUsersQueryDto): Promise<PaginatedAdminUsers> {
    const { items, total } = await this.usersRepository.listForAdmin({
      page: query.page,
      pageSize: query.pageSize,
      search: query.search,
      role: query.role,
    });

    return {
      items,
      page: query.page,
      pageSize: query.pageSize,
      totalItems: total,
      totalPages: Math.max(Math.ceil(total / query.pageSize), 1),
    };
  }

  /**
   * Moves an account between USER and TEACHER.
   *
   * An administrator's own role is out of reach in both directions — the DTO
   * refuses ADMIN as a target, and this refuses an administrator as a subject.
   * Together they close the two ways this endpoint could otherwise end with a
   * platform that has no administrators, or with too many.
   */
  async setRole(
    userId: string,
    dto: UpdateUserRoleDto,
  ): Promise<AdminUserRecord> {
    const existing = await this.usersRepository.findRole(userId);
    if (!existing) {
      throw new NotFoundException(USER_NOT_FOUND_MESSAGE);
    }
    if (existing.accountStatus === AccountStatus.DELETED) {
      throw new ConflictException(DELETED_ACCOUNT_MESSAGE);
    }
    if (existing.role === UserRole.ADMIN) {
      throw new ConflictException(ADMIN_UNTOUCHABLE_MESSAGE);
    }

    return this.usersRepository.updateRole(userId, dto.role);
  }
}
