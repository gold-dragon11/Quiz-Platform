import { UserRole } from '@/shared/types/enums';
import { RequireRole } from '@/shared/guards/RequireRole';

/** Administrator-only routes. Mirrors the backend's `@AdminOnly()`. */
export function RequireAdmin(): React.JSX.Element {
  return <RequireRole role={UserRole.ADMIN} />;
}
