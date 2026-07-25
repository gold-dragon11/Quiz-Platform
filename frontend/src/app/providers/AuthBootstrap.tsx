import { useEffect, useRef } from 'react';
import type { PropsWithChildren } from 'react';
import { authService } from '@/services/auth-service';

/**
 * Runs the startup silent re-authentication exactly once on mount (Phase 6.1
 * decision F5): if a refresh token survives in sessionStorage it is exchanged
 * for a fresh session, otherwise the auth store settles as unauthenticated.
 * Children render immediately — route guards gate on the auth store's
 * `loading` status so no protected content flashes before bootstrap resolves.
 */
export function AuthBootstrap({ children }: PropsWithChildren): React.JSX.Element {
  const started = useRef(false);

  useEffect(() => {
    if (started.current) {
      return;
    }
    started.current = true;
    void authService.bootstrap();
  }, []);

  return <>{children}</>;
}
