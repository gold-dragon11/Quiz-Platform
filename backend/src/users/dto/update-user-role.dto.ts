import { IsIn } from 'class-validator';
import { ASSIGNABLE_ROLES } from '../assignable-roles';
import type { AssignableRole } from '../assignable-roles';

/**
 * Body of PATCH /api/v1/admin/users/:userId/role.
 *
 * `@IsIn(ASSIGNABLE_ROLES)` rather than `@IsEnum(UserRole)`: the enum also
 * carries ADMIN, and a validator that accepts it would make this endpoint a
 * way to mint administrators. Types vanish at runtime; only the value check
 * actually refuses the request.
 */
export class UpdateUserRoleDto {
  @IsIn(ASSIGNABLE_ROLES)
  role!: AssignableRole;
}
