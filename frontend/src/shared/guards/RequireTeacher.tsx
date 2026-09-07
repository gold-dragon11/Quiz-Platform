import { UserRole } from '@/shared/types/enums';
import { RequireRole } from '@/shared/guards/RequireRole';

/**
 * Teacher-only routes. Mirrors the backend's `@TeacherOnly()`, including its
 * refusal to admit administrators: an administrator owns no groups.
 */
export function RequireTeacher(): React.JSX.Element {
  return <RequireRole role={UserRole.TEACHER} />;
}
