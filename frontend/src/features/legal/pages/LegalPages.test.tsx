import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderScreen } from '@/test/render';
import { PRIVACY_CONTACT_EMAIL } from '@/features/legal/constants';
import { DeleteAccountInfoPage } from './DeleteAccountInfoPage';
import { PrivacyPage } from './PrivacyPage';

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
