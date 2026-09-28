import { HttpResponse, http } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { api, server } from '@/test/server';
import { AuthBootstrap } from '@/app/providers/AuthBootstrap';
import { OfflineNotice } from '@/app/providers/OfflineNotice';
import { sessionHint } from '@/services/session-hint';
import { useAuthStore } from '@/stores/auth-store';

/**
 * What being installable changes.
 *
 * Once the app opens from its own cache it opens without a network, which it
 * never used to do — a tab that could not reach the server simply never
 * loaded. Two things follow, and neither belongs to any one screen: saying so
 * instead of showing skeletons that will never fill, and not mistaking «no
 * signal» for «you are logged out».
 */

/** Pretends the machine went offline or came back, events and all. */
function setOnline(online: boolean): void {
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: online });
  act(() => {
    window.dispatchEvent(new Event(online ? 'online' : 'offline'));
  });
}

describe('OfflineNotice', () => {
  afterEach(() => setOnline(true));

  it('says nothing while there is a connection', () => {
    setOnline(true);
    render(<OfflineNotice />);

    expect(screen.queryByText(/Немає зв/)).not.toBeInTheDocument();
  });

  it('explains the empty screen when the connection drops', async () => {
    render(<OfflineNotice />);

    setOnline(false);

    expect(await screen.findByText(/Немає зв’язку/)).toBeInTheDocument();
  });

  it('gets out of the way once the connection is back', async () => {
    render(<OfflineNotice />);
    setOnline(false);
    expect(await screen.findByText(/Немає зв’язку/)).toBeInTheDocument();

    setOnline(true);

    await waitFor(() => expect(screen.queryByText(/Немає зв’язку/)).not.toBeInTheDocument());
  });

  it('is already showing if the app was opened with no connection at all', () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });

    render(<OfflineNotice />);

    expect(screen.getByText(/Немає зв’язку/)).toBeInTheDocument();
  });
});

describe('AuthBootstrap', () => {
  afterEach(() => {
    useAuthStore.setState({ status: 'loading', accessToken: null });
    setOnline(true);
  });

  it('signs the reader back in when the signal returns', async () => {
    sessionHint.remember();
    // Opened in a lift: the startup refresh cannot reach anything.
    server.use(http.post(api('/auth/refresh'), () => HttpResponse.error()));
    render(<AuthBootstrap>ok</AuthBootstrap>);
    await waitFor(() => expect(useAuthStore.getState().status).toBe('unauthenticated'));

    // Back above ground, and the cookie was valid the whole time.
    server.use(http.post(api('/auth/refresh'), () => HttpResponse.json({ accessToken: 'access-1' })));
    setOnline(true);

    await waitFor(() => expect(useAuthStore.getState().status).toBe('authenticated'));
  });

  it('does not keep knocking for a session the server actually refused', async () => {
    sessionHint.remember();
    let calls = 0;
    server.use(
      http.post(api('/auth/refresh'), () => {
        calls += 1;
        return HttpResponse.json({ message: 'Expired' }, { status: 401 });
      }),
    );
    render(<AuthBootstrap>ok</AuthBootstrap>);
    await waitFor(() => expect(calls).toBe(1));

    setOnline(true);

    // The hint was dropped on the refusal, so coming online changes nothing.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(calls).toBe(1);
  });
});

describe('NewVersionPrompt', () => {
  afterEach(() => vi.resetModules());

  /** Stands in for the service worker registration the build injects. */
  const withWaitingUpdate = (update: () => void) => {
    vi.doMock('virtual:pwa-register/react', () => ({
      useRegisterSW: () => ({
        needRefresh: [true, vi.fn()],
        offlineReady: [false, vi.fn()],
        updateServiceWorker: update,
      }),
    }));
  };

  it('offers the update rather than swapping the build underneath someone', async () => {
    const update = vi.fn();
    withWaitingUpdate(update);
    const { NewVersionPrompt } = await import('@/app/providers/NewVersionPrompt');
    const user = userEvent.setup();

    render(<NewVersionPrompt />);
    expect(screen.getByText('Є новіша версія')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Оновити' }));

    // `true` is «reload once the new worker has taken over».
    expect(update).toHaveBeenCalledWith(true);
  });

  it('says nothing when there is nothing waiting', async () => {
    vi.doMock('virtual:pwa-register/react', () => ({
      useRegisterSW: () => ({
        needRefresh: [false, vi.fn()],
        offlineReady: [false, vi.fn()],
        updateServiceWorker: vi.fn(),
      }),
    }));
    const { NewVersionPrompt } = await import('@/app/providers/NewVersionPrompt');

    render(<NewVersionPrompt />);

    expect(screen.queryByText('Є новіша версія')).not.toBeInTheDocument();
  });
});
