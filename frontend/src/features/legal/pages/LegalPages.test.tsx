import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';
import { api, server } from '@/test/server';
import { screen } from '@testing-library/react';
import { renderScreen } from '@/test/render';
import { PRIVACY_CONTACT_EMAIL } from '@/features/legal/constants';
import { DeleteAccountInfoPage } from './DeleteAccountInfoPage';
import { PrivacyPage } from './PrivacyPage';
import { UnsubscribePage } from './UnsubscribePage';

describe('PrivacyPage', () => {
  it('opens without a session and says what is kept, who sees it and where to write', () => {
    renderScreen(<PrivacyPage />);

    expect(screen.getByRole('heading', { level: 1, name: 'Політика приватності' })).toBeInTheDocument();
    for (const title of ['Що ми зберігаємо', 'Хто бачить ваші дані', 'Як довго зберігаємо', 'Ваші права']) {
      expect(screen.getByRole('heading', { level: 2, name: title })).toBeInTheDocument();
    }
    for (const link of screen.getAllByRole('link', { name: PRIVACY_CONTACT_EMAIL })) {
      expect(link).toHaveAttribute('href', `mailto:${PRIVACY_CONTACT_EMAIL}`);
    }
  });

  it('points to the deletion page', () => {
    renderScreen(<PrivacyPage />);

    expect(screen.getByRole('link', { name: 'на окремій сторінці' })).toHaveAttribute(
      'href',
      '/delete-account',
    );
  });
});

describe('DeleteAccountInfoPage', () => {
  it('covers the person who can sign in and the one who cannot', () => {
    renderScreen(<DeleteAccountInfoPage />);

    expect(screen.getByRole('heading', { level: 2, name: 'Якщо ви можете увійти' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Увійдіть' })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('link', { name: 'Відновіть його' })).toHaveAttribute('href', '/forgot-password');
    expect(screen.getByRole('link', { name: PRIVACY_CONTACT_EMAIL })).toHaveAttribute(
      'href',
      `mailto:${PRIVACY_CONTACT_EMAIL}?subject=${encodeURIComponent('Видалення акаунта L&S')}`,
    );
  });
});

describe('UnsubscribePage', () => {
  const openWith = (route: string) => renderScreen(<UnsubscribePage />, { path: '/unsubscribe', route });

  it('switches the email off as soon as the link opens, with the token from it', async () => {
    const sent: unknown[] = [];
    server.use(
      http.post(api('/notifications/unsubscribe'), async ({ request }) => {
        sent.push(await request.json());
        return HttpResponse.json({ ok: true });
      }),
    );

    openWith('/unsubscribe?token=abc.def');

    expect(await screen.findByText(/більше не приходитимуть/)).toBeInTheDocument();
    expect(sent).toEqual([{ token: 'abc.def' }]);
  });

  it('says where else to switch it off when the link is broken', async () => {
    server.use(
      http.post(api('/notifications/unsubscribe'), () =>
        HttpResponse.json({ message: 'Посилання недійсне.' }, { status: 400 }),
      ),
    );

    openWith('/unsubscribe?token=broken');

    expect(await screen.findByText(/Посилання не спрацювало/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'налаштуваннях' })).toHaveAttribute('href', '/settings');
  });
});
