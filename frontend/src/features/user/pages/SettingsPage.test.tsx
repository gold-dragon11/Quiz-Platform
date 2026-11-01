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

/** The settings endpoint, recording what a PATCH sent. */
const emailSettings = () => {
  const sent: unknown[] = [];
  let current = { assignmentEmailsEnabled: true, mistakeEmailsEnabled: false };
  server.use(
    http.get(api('/users/me/settings'), () => HttpResponse.json(current)),
    http.patch(api('/users/me/settings'), async ({ request }) => {
      const body = (await request.json()) as Partial<typeof current>;
      sent.push(body);
      current = { ...current, ...body };
      return HttpResponse.json(current);
    }),
  );
  return sent;
};

const open = () => renderScreen(<SettingsPage />, { path: '/settings', route: '/settings' });

describe('SettingsPage', () => {
  const signedIn = () => useAuthStore.setState({ status: 'authenticated', accessToken: 'token' });
  afterEach(() => useAuthStore.setState({ status: 'loading', accessToken: null }));

  it('offers an ordinary account its password, its profile and the way out', async () => {
    signedIn();
    server.use(account(false));
    emailSettings();
    open();

    expect(await screen.findByRole('button', { name: /Змінити пароль/ })).toBeInTheDocument();
    expect(screen.getByText('Видалення акаунта')).toBeInTheDocument();
  });

  it('shows which emails arrive, the mistakes one off until asked for', async () => {
    signedIn();
    server.use(account(false));
    const sent = emailSettings();
    const { user } = open();

    const homework = await screen.findByRole('checkbox', { name: /Домашні завдання/ });
    const mistakes = screen.getByRole('checkbox', { name: /Помилки чекають/ });
    expect(homework).toBeChecked();
    expect(mistakes).not.toBeChecked();

    await user.click(mistakes);

    expect(await screen.findByText('Нагадування про помилки увімкнено.')).toBeInTheDocument();
    expect(sent).toEqual([{ mistakeEmailsEnabled: true }]);
    expect(screen.getByRole('checkbox', { name: /Помилки чекають/ })).toBeChecked();
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
