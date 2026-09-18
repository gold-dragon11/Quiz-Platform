import { HttpResponse, http } from 'msw';
import { afterEach, describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { api, server } from '@/test/server';
import { renderScreen } from '@/test/render';
import { useLiveStore } from '@/features/duels/live/live-client';
import { LivePlaySection } from './LivePlaySection';

const MATHS = 'subject-maths';

/** Mathematics as the bank has it: nothing fits ten seconds, little fits fifteen. */
const availability = {
  subjectId: MATHS,
  topicId: null,
  options: [
    { seconds: 10, available: 0 },
    { seconds: 15, available: 7 },
    { seconds: 20, available: 320 },
    { seconds: 30, available: 966 },
    { seconds: 45, available: 1225 },
    { seconds: 60, available: 1282 },
  ],
};

const mount = () => {
  server.use(
    http.get(api('/subjects'), () =>
      HttpResponse.json([{ id: MATHS, name: 'Математика', slug: 'mathematics' }]),
    ),
    http.get(api(`/subjects/${MATHS}/topics`), () => HttpResponse.json([])),
    http.get(api('/duels/live/availability'), () => HttpResponse.json(availability)),
  );
  useLiveStore.setState({ connection: 'ready' });
  return renderScreen(<LivePlaySection />);
};

describe('LivePlaySection', () => {
  afterEach(() => useLiveStore.setState({ connection: 'off', queue: null, outgoing: null }));

  it('switches off a time that no question of the subject fits', async () => {
    const { user } = mount();
    await screen.findByRole('option', { name: 'Математика' });
    await user.selectOptions(screen.getByLabelText('Предмет'), MATHS);

    // Disabled once the count for each time has arrived.
    await waitFor(() => expect(screen.getByRole('button', { name: '10 с' })).toBeDisabled());
    expect(screen.getByRole('button', { name: '20 с' })).toBeEnabled();
  });

  it('says how many fit when the chosen count is more than the time allows', async () => {
    const { user } = mount();
    await screen.findByRole('option', { name: 'Математика' });
    await user.selectOptions(screen.getByLabelText('Предмет'), MATHS);
    await waitFor(() => expect(screen.getByRole('button', { name: '10 с' })).toBeDisabled());
    await user.click(screen.getByRole('button', { name: '15 с' }));

    expect(await screen.findByText(/встигається лише 7 питань/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Шукати суперника' })).toBeDisabled();
    // Five of those seven still make a game.
    await user.click(screen.getByRole('button', { name: '5' }));
    expect(screen.getByRole('button', { name: 'Шукати суперника' })).toBeEnabled();
  });

  it('asks for a username only when challenging somebody by name', async () => {
    const { user } = mount();
    expect(screen.queryByLabelText('Нік суперника')).not.toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: 'За ніком' }));
    expect(screen.getByLabelText('Нік суперника')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Викликати зараз' })).toBeDisabled();
  });

  it('shows the search, not the form, while waiting in the queue', () => {
    server.use(http.get(api('/subjects'), () => HttpResponse.json([])));
    useLiveStore.setState({
      connection: 'ready',
      queue: {
        state: 'waiting',
        since: Date.now(),
        serverNow: Date.now(),
        subjectId: MATHS,
        topicId: null,
        seconds: 20,
        count: 10,
      },
    });
    renderScreen(<LivePlaySection />);

    expect(screen.getByText(/Шукаємо суперника/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Скасувати' })).toBeInTheDocument();
  });
});
