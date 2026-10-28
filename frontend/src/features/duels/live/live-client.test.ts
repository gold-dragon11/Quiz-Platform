import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * The socket library is fetched on the first connect rather than bundled with
 * every page. What must hold: it opens one socket however often the host
 * mounts, and a sign-out that lands before the library does opens none.
 */

const fakeSocket = { on: vi.fn(), disconnect: vi.fn(), connect: vi.fn(), connected: false };
const io = vi.fn(() => fakeSocket);
vi.mock('socket.io-client', () => ({ io }));

const { connectLive, disconnectLive, useLiveStore } = await import('./live-client');

/** Lets the dynamic import and its `then` run. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

afterEach(() => {
  disconnectLive();
  io.mockClear();
});

describe('connectLive', () => {
  it('fetches the library once and opens one socket, however often it is called', async () => {
    connectLive();
    connectLive();
    expect(useLiveStore.getState().connection).toBe('connecting');

    await settle();
    connectLive();
    await settle();

    expect(io).toHaveBeenCalledTimes(1);
  });

  it('opens nothing when the user signs out before the library arrives', async () => {
    connectLive();
    disconnectLive();
    await settle();

    expect(io).not.toHaveBeenCalled();
    expect(useLiveStore.getState().connection).not.toBe('connecting');
  });
});
