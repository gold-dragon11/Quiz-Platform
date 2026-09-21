import { HttpResponse, http } from 'msw';
import { afterEach, describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { api, server } from '@/test/server';
import { renderScreen } from '@/test/render';
import { useAuthStore } from '@/stores/auth-store';
import { SettingsPage } from './SettingsPage';

/**
 * The demo account is public: anybody may sign in as it, and anybody could
 * change its password and lock the next visitor out. The backend refuses
 * that, and this screen must not offer it — three forms that each answer
 * «forbidden» are worse than one sentence saying so.
 */

const account = (isDemo: boolean) =>
  http.get(api('/auth/me'), () =>
    HttpResponse.json({
      id: 'u-1',
      email: isDemo ? 'demo-student@learn-ls.com' : 'learner@example.com',
      role: 'USER',
      accountStatus: 'ACTIVE',
      isDemo,
      profile: { displayName: 'Олена', username: 'olena', publicProfileEnabled: true },
      avatar: null,
    }),
  );

const open = () => renderScreen(<SettingsPage />, { path: '/settings', route: '/settings' });

describe('SettingsPage', () => {
  const signedIn = () => useAuthStore.setState({ status: 'authenticated', accessToken: 'token' });
  afterEach(() => useAuthStore.setState({ status: 'loading', accessToken: null }));

  it('offers an ordinary account its password, its profile and the way out', async () => {
    signedIn();
    server.use(account(false));
    open();

    expect(await screen.findByRole('button', { name: /Змінити пароль/ })).toBeInTheDocument();
    expect(screen.getByText('Видалення акаунта')).toBeInTheDocument();
  });

  it('offers a demo account none of it, and says why', async () => {
    signedIn();
    server.use(account(true));
    open();

    expect(await screen.findByText(/Це демо-акаунт/)).toBeInTheDocument();
    expect(screen.getByText(/щоночі все повертається до початкового стану/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Змінити пароль/ })).not.toBeInTheDocument();
    expect(screen.queryByText('Видалення акаунта')).not.toBeInTheDocument();
  });
});
