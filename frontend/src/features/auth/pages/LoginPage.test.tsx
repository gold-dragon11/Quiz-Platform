import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { api, server } from '@/test/server';
import { renderScreen } from '@/test/render';
import { LoginPage } from './LoginPage';

const fillAndSubmit = async (user: ReturnType<typeof renderScreen>['user']): Promise<void> => {
  await user.type(screen.getByLabelText('Електронна пошта'), 'learner@example.com');
  await user.type(screen.getByLabelText('Пароль'), 'ValidPass1!');
  await user.click(screen.getByRole('button', { name: 'Увійти' }));
};

describe('LoginPage', () => {
  it('refuses to submit an empty form and says which field is missing', async () => {
    const { user } = renderScreen(<LoginPage />, { path: '/login', route: '/login' });

    await user.click(screen.getByRole('button', { name: 'Увійти' }));

    expect(await screen.findByText('Вкажіть електронну пошту')).toBeInTheDocument();
    expect(screen.getByText('Вкажіть пароль')).toBeInTheDocument();
  });

  it('arrives from «Спробувати демо» with the demo account filled in', async () => {
    let sent: { email: string; password: string } | null = null;
    server.use(
      http.post(api('/auth/login'), async ({ request }) => {
        sent = (await request.json()) as typeof sent;
        return HttpResponse.json({ accessToken: 'token' });
      }),
    );
    const { user } = renderScreen(<LoginPage />, { path: '/login', route: '/login?demo=teacher' });

    expect(screen.getByLabelText('Електронна пошта')).toHaveValue('demo-teacher@learn-ls.com');
    expect(screen.getByText(/Демо-акаунт вчителя/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Увійти' }));

    await waitFor(() =>
      expect(sent).toEqual({ email: 'demo-teacher@learn-ls.com', password: 'LsDemo2026!' }),
    );
  });

  it('ignores a ?demo= value that names no demo account', () => {
    renderScreen(<LoginPage />, { path: '/login', route: '/login?demo=admin' });

    expect(screen.getByLabelText('Електронна пошта')).toHaveValue('');
  });

  it('shows the server’s refusal once, not twice', async () => {
    // The shared error helper used to raise a toast as well as the form
    // error, so the same sentence appeared over the form and in the corner.
    server.use(
      http.post(api('/auth/login'), () =>
        HttpResponse.json({ message: 'Неправильна електронна адреса або пароль.' }, { status: 401 }),
      ),
    );
    const { user } = renderScreen(<LoginPage />, { path: '/login', route: '/login' });

    await fillAndSubmit(user);

    const shown = await screen.findAllByText('Неправильна електронна адреса або пароль.');
    expect(shown).toHaveLength(1);
  });

  it('sends the reader on once the credentials are accepted', async () => {
    server.use(
      http.post(api('/auth/login'), () =>
        HttpResponse.json({ accessToken: 'access-token', refreshToken: 'refresh-token' }),
      ),
    );
    const { user } = renderScreen(<LoginPage />, {
      path: '/login',
      route: '/login',
      also: [{ path: '/dashboard', element: <p>Головна</p> }],
    });

    await fillAndSubmit(user);

    await waitFor(() => expect(screen.getByText('Головна')).toBeInTheDocument());
  });
});
