import { HttpResponse, http } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import { api, server } from '@/test/server';
import { renderScreen } from '@/test/render';
import { LandingPage } from './LandingPage';
import type { Catalogue } from '@/features/landing/api/catalogue.api';

/**
 * The landing is mostly drawing, and drawings are checked by eye. What is
 * worth holding still here is what a visitor reads and can act on — and that
 * the page is complete without any of its motion: the test environment has no
 * IntersectionObserver and reports a narrow screen, so every scene below must
 * stand in its final frame on its own.
 */

const catalogue: Catalogue = {
  subjects: [
    { name: 'Математика', slug: 'math', topics: [], questionCount: 2000, materialCount: 20 },
    { name: 'Історія України', slug: 'history', topics: [], questionCount: 1800, materialCount: 20 },
    { name: 'Українська мова', slug: 'ukrainian', topics: [], questionCount: 1000, materialCount: 20 },
    { name: 'Англійська мова', slug: 'english', topics: [], questionCount: 599, materialCount: 16 },
  ],
  totalQuestions: 5399,
  totalTopics: 76,
  totalMaterials: 76,
};

const open = (body: Catalogue = catalogue) => {
  server.use(http.get(api('/catalogue'), () => HttpResponse.json(body)));
  return renderScreen(<LandingPage />);
};

describe('LandingPage', () => {
  it('offers both ways in from the bar, as in production', () => {
    open();

    const bar = screen.getByRole('navigation', { name: 'Головна навігація' });
    expect(within(bar).getByRole('button', { name: 'Увійти' })).toBeInTheDocument();
    expect(within(bar).getByRole('button', { name: /Зареєструватись/ })).toBeInTheDocument();
  });

  it('tells the whole story in order, one scene per thing the product does', () => {
    open();

    const headings = screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent);
    expect(headings).toEqual([
      'Тема. Відповіді. Розбір.',
      'Помилка повертається, доки її не виправиш.',
      'Цілий зошит на годиннику іспиту.',
      'Ті самі питання. Точніший перемагає.',
      'Видно, хто здав і де група посипалася.',
      'Почни навчатися вже за хвилину.',
    ]);
  });

  it('takes «Дізнатись більше» down to how a test goes', async () => {
    const { user } = open();
    const scroll = vi.spyOn(Element.prototype, 'scrollIntoView');

    await user.click(screen.getByRole('button', { name: /Дізнатись більше/ }));

    expect(scroll).toHaveBeenCalled();
    expect(scroll.mock.contexts[0]).toBe(document.getElementById('yak-tse-pratsiuie'));
    scroll.mockRestore();
  });

  it('counts the bank from the catalogue, in agreeing words', async () => {
    open();

    // The figure is grouped by a non-breaking space; the query normalises it.

    expect(await screen.findByText('5 399')).toBeInTheDocument();
    expect(screen.getByText('опублікованих питань')).toBeInTheDocument();
    expect(screen.getByText('предмети')).toBeInTheDocument();
    expect(screen.getByText('тем')).toBeInTheDocument();
  });

  it('leaves materials out, since every topic has exactly one', async () => {
    open();

    await screen.findByText('5 399');
    expect(screen.queryByText(/матеріал/)).not.toBeInTheDocument();
  });

  it('shows a duel that has already been played out, without waiting for the screen', () => {
    open();

    expect(screen.getByText('✓ правильно · 4,2 с')).toBeInTheDocument();
    expect(screen.getByText('✗ помилка · 9,2 с')).toBeInTheDocument();
    expect(screen.getByText('балів')).toBeInTheDocument();
  });

  it('shows the example score itself rather than a counter stuck at its start', () => {
    open();

    expect(screen.getByText('Приклад результату: 172 з 200')).toBeInTheDocument();
    expect(screen.getByText('172')).toBeInTheDocument();
  });

  it('sends a tutor to sign up as a teacher', () => {
    open();

    expect(screen.getByRole('link', { name: 'Створити акаунт вчителя' })).toHaveAttribute(
      'href',
      '/register?as=teacher',
    );
  });
});
