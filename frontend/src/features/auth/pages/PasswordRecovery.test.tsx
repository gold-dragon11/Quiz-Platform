import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { api, server } from '@/test/server';
import { renderScreen } from '@/test/render';
import { ForgotPasswordPage } from './ForgotPasswordPage';
import { ResetPasswordPage } from './ResetPasswordPage';

/**
 * Losing a password is the one flow a person runs while already annoyed. Two
 * things have to hold: asking for a link never reveals whether the address is
 * registered, and a link that has expired says so plainly instead of failing
 * silently.
 */

describe('ForgotPasswordPage', () => {
  it('answers the same way whether or not the address is registered', async () => {
    server.use(http.post(api('/auth/forgot-password'), () => HttpResponse.json({}, { status: 202 })));
    const { user } = renderScreen(<ForgotPasswordPage />, {
      path: '/forgot-password',
      route: '/forgot-password',
    });

    await user.type(screen.getByLabelText('Електронна пошта'), 'nobody@example.com');
    await user.click(screen.getByRole('button', { name: /Надіслати/ }));

    expect(await screen.findByText('Перевірте пошту')).toBeInTheDocument();
  });

  it('will not send an obviously broken address', async () => {
    let calls = 0;
    server.use(
      http.post(api('/auth/forgot-password'), () => {
        calls += 1;
        return HttpResponse.json({}, { status: 202 });
      }),
    );
    const { user } = renderScreen(<ForgotPasswordPage />, {
      path: '/forgot-password',
      route: '/forgot-password',
    });

    await user.type(screen.getByLabelText('Електронна пошта'), 'not-an-address');
    await user.click(screen.getByRole('button', { name: /Надіслати/ }));

    expect(await screen.findByText('Введіть коректну електронну адресу')).toBeInTheDocument();
    expect(calls).toBe(0);
  });
});

describe('ResetPasswordPage', () => {
  const open = (route: string) => renderScreen(<ResetPasswordPage />, { path: '/reset-password', route });

  it('says the link is broken when it carries no token', () => {
    open('/reset-password');

    expect(screen.getByText('Недійсне посилання')).toBeInTheDocument();
  });

  it('confirms the change and says the other sessions are gone', async () => {
    server.use(http.post(api('/auth/reset-password'), () => HttpResponse.json({}, { status: 200 })));
    const { user } = open('/reset-password?token=reset-token');

    await user.type(screen.getByLabelText('Новий пароль'), 'BrandNew1!');
    await user.type(screen.getByLabelText('Підтвердіть новий пароль'), 'BrandNew1!');
    await user.click(screen.getByRole('button', { name: 'Змінити пароль' }));

    expect(await screen.findByText('Пароль змінено')).toBeInTheDocument();
    expect(screen.getByText(/активні сеанси завершено/)).toBeInTheDocument();
  });

  it('shows an expired link as the server describes it', async () => {
    server.use(
      http.post(api('/auth/reset-password'), () =>
        HttpResponse.json(
          { message: 'Посилання для зміни пароля недійсне або його термін минув.' },
          { status: 400 },
        ),
      ),
    );
    const { user } = open('/reset-password?token=stale-token');

    await user.type(screen.getByLabelText('Новий пароль'), 'BrandNew1!');
    await user.type(screen.getByLabelText('Підтвердіть новий пароль'), 'BrandNew1!');
    await user.click(screen.getByRole('button', { name: 'Змінити пароль' }));

    expect(
      await screen.findByText('Посилання для зміни пароля недійсне або його термін минув.'),
    ).toBeInTheDocument();
  });
});
