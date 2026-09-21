import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { api, server } from '@/test/server';
import { renderScreen } from '@/test/render';
import { RegisterPage } from './RegisterPage';

/**
 * Registration is where a mistake costs the most: the person is not a user
 * yet, and anything they cannot understand sends them away for good. What
 * matters is that a refusal lands on the field that caused it, and that a
 * success says the account exists but the address still needs confirming.
 */

const open = () => renderScreen(<RegisterPage />, { path: '/register', route: '/register' });

const fill = async (
  user: ReturnType<typeof renderScreen>['user'],
  values: { email?: string; username?: string; password?: string; confirm?: string } = {},
): Promise<void> => {
  await user.type(screen.getByLabelText('Електронна пошта'), values.email ?? 'new@example.com');
  await user.type(screen.getByLabelText('Імʼя користувача'), values.username ?? 'oksana_k');
  await user.type(screen.getByLabelText('Пароль'), values.password ?? 'ValidPass1!');
  await user.type(
    screen.getByLabelText('Підтвердіть пароль'),
    values.confirm ?? values.password ?? 'ValidPass1!',
  );
  await user.click(screen.getByRole('button', { name: 'Створити акаунт' }));
};

describe('RegisterPage', () => {
  it('catches mismatched passwords before asking the server', async () => {
    let calls = 0;
    server.use(
      http.post(api('/auth/register'), () => {
        calls += 1;
        return HttpResponse.json({}, { status: 201 });
      }),
    );
    const { user } = open();

    await fill(user, { password: 'ValidPass1!', confirm: 'OtherPass1!' });

    expect(await screen.findByText('Паролі не збігаються')).toBeInTheDocument();
    expect(calls).toBe(0);
  });

  it('puts a taken email on the email field, not in a corner toast', async () => {
    server.use(
      http.post(api('/auth/register'), () =>
        HttpResponse.json({ message: 'Ця електронна адреса вже зареєстрована.' }, { status: 409 }),
      ),
    );
    const { user } = open();

    await fill(user);

    expect(await screen.findByText('Ця електронна адреса вже зареєстрована.')).toBeInTheDocument();
  });

  it('puts a taken username on the username field', async () => {
    server.use(
      http.post(api('/auth/register'), () =>
        HttpResponse.json({ message: 'Таке імʼя користувача вже зайняте.' }, { status: 409 }),
      ),
    );
    const { user } = open();

    await fill(user);

    expect(await screen.findByText('Таке імʼя користувача вже зайняте.')).toBeInTheDocument();
  });

  it('asks for the letter to be opened, and offers to send it again', async () => {
    let resends = 0;
    server.use(
      http.post(api('/auth/register'), () => HttpResponse.json({ id: 'u-1' }, { status: 201 })),
      http.post(api('/auth/resend-verification'), () => {
        resends += 1;
        return HttpResponse.json({}, { status: 202 });
      }),
    );
    const { user } = open();

    await fill(user, { email: 'new@example.com' });

    expect(await screen.findByText('Перевірте пошту')).toBeInTheDocument();
    expect(screen.getByText(/new@example.com/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Надіслати лист повторно' }));
    expect(await screen.findByText(/нове посилання вже в дорозі/)).toBeInTheDocument();
    expect(resends).toBe(1);
  });

  it('registers a teacher as a teacher', async () => {
    let sentRole: unknown = null;
    server.use(
      http.post(api('/auth/register'), async ({ request }) => {
        sentRole = ((await request.json()) as { role?: unknown }).role;
        return HttpResponse.json({ id: 'u-1' }, { status: 201 });
      }),
    );
    const { user } = open();

    await user.click(screen.getByRole('radio', { name: /Я вчитель/ }));
    await fill(user);

    expect(await screen.findByText('Перевірте пошту')).toBeInTheDocument();
    expect(sentRole).toBe('TEACHER');
  });
});
