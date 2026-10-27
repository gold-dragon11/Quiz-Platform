import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import { api, server } from '@/test/server';
import { renderScreen } from '@/test/render';
import { LandingPage } from './LandingPage';
import type { Catalogue } from '@/features/landing/api/catalogue.api';

/**
 * What a visitor reads and can act on, and that the page is complete without
 * its motion: the test environment has no IntersectionObserver and plays no
 * animation, so everything below must stand in its final state on its own.
 */

const catalogue: Catalogue = {
  subjects: [
    { name: 'Математика', slug: 'math', topics: ['a', 'b'], questionCount: 2000, materialCount: 2 },
    { name: 'Історія України', slug: 'history', topics: ['c'], questionCount: 1800, materialCount: 1 },
    { name: 'Українська мова', slug: 'ukrainian', topics: ['d'], questionCount: 1000, materialCount: 1 },
    { name: 'Англійська мова', slug: 'english', topics: ['e'], questionCount: 599, materialCount: 1 },
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
  it('offers every way in as a link, so each opens in a new tab and reads as one', () => {
    open();

    const bar = screen.getByRole('navigation', { name: 'Головна навігація' });
    expect(within(bar).getByRole('link', { name: 'Увійти' })).toHaveAttribute('href', '/login');
    expect(within(bar).getByRole('link', { name: 'Зареєструватися' })).toHaveAttribute('href', '/register');
    expect(within(bar).getByRole('link', { name: 'Спробувати демо' })).toHaveAttribute(
      'href',
      '/login?demo=student',
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('opens on the headline, one sentence and the action, with no word set apart', () => {
    open();

    const hero = screen.getByRole('heading', { level: 1 });
    expect(hero).toHaveTextContent('Вчись.Прогресуй.Повторюй.');
    expect(hero.querySelector('em, i, span')).toBeNull();
    const section = hero.closest('section') as HTMLElement;
    expect(within(section).getByRole('link', { name: 'Зареєструватися' })).toBeInTheDocument();
  });

  it('tells the story in order, one section per thing the product does', () => {
    open();

    const heads = screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent);
    expect(heads).toEqual([
      'Тест, розбір, повторення.',
      'Помилка повертається, доки її не виправиш.',
      'Пробний НМТ на годиннику іспиту.',
      'Ті самі питання. Точніший перемагає.',
      'Видно, хто здав і де група посипалася.',
      'Коротко про бал, банк і репетитора.',
      'Почни навчатися вже за хвилину.',
    ]);
  });

  it('shows the product itself: four captured screens, each with what it shows', () => {
    open();

    const figures = screen.getAllByRole('img').filter((image) => image.tagName === 'IMG');
    expect(figures).toHaveLength(4);
    for (const image of figures) expect(image).toHaveAttribute('alt');
    expect(screen.getByText(/бали за кожним із 22 завдань/)).toBeInTheDocument();
  });

  it('counts the bank from the catalogue, subject by subject, in agreeing words', async () => {
    open();

    // The thousands are parted by a no-break space, as Ukrainian sets them.
    expect(await screen.findByRole('heading', { name: /^5\s399 питань у банку\.$/ })).toBeInTheDocument();
    const table = screen.getByRole('table', { name: 'Предмети в банку питань' });
    expect(within(table).getByRole('rowheader', { name: 'Математика' })).toBeInTheDocument();
    expect(within(table).getByText(/^2\s000$/)).toBeInTheDocument();
    expect(screen.getByText(/4 предмети і 76 тем/)).toBeInTheDocument();
  });

  it('leaves the bank out rather than print a figure it does not have', async () => {
    server.use(http.get(api('/catalogue'), () => HttpResponse.json({}, { status: 500 })));
    renderScreen(<LandingPage />);

    await screen.findByRole('heading', { name: 'Коротко про бал, банк і репетитора.' });
    expect(screen.queryByRole('heading', { name: /у банку/ })).not.toBeInTheDocument();
  });

  it('shows a duel already played out, and the example score as an example', () => {
    open();

    expect(screen.getByText('правильно, 4,2 с')).toBeInTheDocument();
    expect(screen.getByText('помилка, 9,2 с')).toBeInTheDocument();
    expect(screen.getByText('Приклад результату: 172 з 200')).toBeInTheDocument();
  });

  it('sends a tutor to sign up as a teacher, or into the teacher demo', () => {
    open();

    expect(
      screen.getAllByRole('link', { name: /Створити акаунт вчителя|Акаунт вчителя/ })[0],
    ).toHaveAttribute('href', '/register?as=teacher');
    expect(screen.getAllByRole('link', { name: 'Демо вчителя' })[0]).toHaveAttribute(
      'href',
      '/login?demo=teacher',
    );
  });

  it('carries none of the template punctuation: no middle dots, no dashes in the copy', () => {
    const { container } = open();

    expect(container.textContent).not.toMatch(/·|—|–/);
  });
});
