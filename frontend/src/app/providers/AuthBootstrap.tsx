import { useEffect, useRef } from 'react';
import type { PropsWithChildren } from 'react';
import { authService } from '@/services/auth-service';
import { sessionHint } from '@/services/session-hint';
import { useAuthStore } from '@/stores/auth-store';

/**
 * Runs the startup silent re-authentication exactly once on mount (Phase 6.1
 * decision F5): the session cookie is exchanged for a fresh access token, or
 * the auth store settles as unauthenticated. Children render immediately —
 * route guards gate on the auth store's `loading` status so no protected
 * content flashes before bootstrap resolves.
 *
 * It also tries again when the browser comes back online. The app is
 * installable now, so it is routinely opened with no network at all: that
 * first attempt fails, and without this the reader would be looking at a login
 * form until they thought to reload, holding a session cookie that was valid
 * the whole time. Nothing is retried for a session the server actually
 * refused — `refreshSession` drops the hint in that case, and this checks it.
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

  useEffect(() => {
    const retry = (): void => {
      if (useAuthStore.getState().status === 'unauthenticated' && sessionHint.exists()) {
        void authService.bootstrap();
      }
    };
    window.addEventListener('online', retry);
    return () => window.removeEventListener('online', retry);
  }, []);

  return <>{children}</>;
}
