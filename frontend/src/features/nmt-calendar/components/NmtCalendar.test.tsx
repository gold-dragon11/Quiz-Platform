import { HttpResponse, http } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { api, server } from '@/test/server';
import { renderScreen } from '@/test/render';
import { NmtCalendarSection } from './NmtCalendarSection';
import { NmtCountdownText } from './NmtCountdownText';

describe('NmtCountdownText', () => {
  afterEach(() => vi.useRealTimers());

  it('counts down to the main session once a date is entered', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true, now: new Date('2026-11-04T12:00:00Z') });
    server.use(
      http.get(api('/calendar/nmt'), () =>
        HttpResponse.json({
          mainSession: {
            startDate: '2027-05-14',
            startsAt: '2027-05-13T21:00:00.000Z',
            sourceUrl: 'https://testportal.gov.ua/kalendar',
          },
        }),
      ),
    );

    renderScreen(
      <p>
        4 листопада
        <NmtCountdownText prefix=" · " />
      </p>,
    );

    expect(await screen.findByText('190 днів 9 годин')).toBeInTheDocument();
    expect(screen.getByText(/до основної сесії НМТ/)).toBeInTheDocument();
  });

  it('leaves no trace while no date is entered', async () => {
    let asked = false;
    server.use(
      http.get(api('/calendar/nmt'), () => {
        asked = true;
        return HttpResponse.json({ mainSession: null });
      }),
    );

    renderScreen(
      <p data-testid="meta">
        4 листопада
        <NmtCountdownText prefix=" · " />
      </p>,
    );

    await vi.waitFor(() => expect(asked).toBe(true));
    expect(screen.getByTestId('meta')).toHaveTextContent(/^4 листопада$/);
  });
});

describe('NmtCalendarSection', () => {
  it('says nothing is shown until a date and its source are entered, then saves both', async () => {
    let saved: unknown = null;
    server.use(
      http.get(api('/admin/calendar/nmt'), () => HttpResponse.json({ calendar: saved })),
      http.get(api('/calendar/nmt'), () => HttpResponse.json({ mainSession: null })),
      http.put(api('/admin/calendar/nmt'), async ({ request }) => {
        const body = (await request.json()) as { mainSessionStart: string; sourceUrl: string };
        saved = { ...body, updatedAt: '2026-11-04T12:00:00.000Z' };
        return HttpResponse.json({ calendar: saved });
      }),
    );
    const { user } = renderScreen(<NmtCalendarSection />);

    expect(await screen.findByText(/Дату не внесено, тож відліку ніде немає/)).toBeInTheDocument();
    const button = screen.getByRole('button', { name: 'Зберегти дату' });
    expect(button).toBeDisabled();

    await user.type(screen.getByLabelText('Перший день основної сесії'), '2027-05-14');
    await user.type(screen.getByLabelText('Посилання на джерело'), 'https://testportal.gov.ua/kalendar');
    await user.click(button);

    expect(await screen.findByText(/Дату збережено/)).toBeInTheDocument();
    expect(saved).toMatchObject({
      mainSessionStart: '2027-05-14',
      sourceUrl: 'https://testportal.gov.ua/kalendar',
    });
    expect(await screen.findByText('14 травня 2027')).toBeInTheDocument();
  });

  it('shows the API’s reason when a date is refused', async () => {
    server.use(
      http.get(api('/admin/calendar/nmt'), () => HttpResponse.json({ calendar: null })),
      http.put(api('/admin/calendar/nmt'), () =>
        HttpResponse.json({ message: 'Дата має бути в майбутньому.' }, { status: 400 }),
      ),
    );
    const { user } = renderScreen(<NmtCalendarSection />);

    await user.type(await screen.findByLabelText('Перший день основної сесії'), '2020-05-14');
    await user.type(screen.getByLabelText('Посилання на джерело'), 'https://testportal.gov.ua/kalendar');
    await user.click(screen.getByRole('button', { name: 'Зберегти дату' }));

    expect(await screen.findByText('Дата має бути в майбутньому.')).toBeInTheDocument();
  });
});
