import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { authService } from '@/services/auth-service';
import { ROUTES } from '@/shared/constants/routes';

/**
 * Signs the user out using the existing auth infrastructure: revokes the
 * refresh token server-side and clears the in-memory/session tokens
 * (authService.logout → clearSession), then clears the React Query cache and
 * redirects to the landing page. Never throws — logout always completes
 * locally even if the network call fails.
 */
export function useLogout(): { logout: () => Promise<void>; isPending: boolean } {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isPending, setIsPending] = useState(false);

  const logout = async (): Promise<void> => {
    setIsPending(true);
    try {
      await authService.logout();
    } finally {
      queryClient.clear();
      navigate(ROUTES.home, { replace: true });
    }
  };

  return { logout, isPending };
}
