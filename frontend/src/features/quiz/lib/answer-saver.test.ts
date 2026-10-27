import { afterEach, describe, expect, it, vi } from 'vitest';
import { createAnswerSaver, type SaveStatus } from './answer-saver';

/** A send whose requests stay open until the test settles them. */
function controllableSend() {
  const calls: { questionId: string; answer: unknown; resolve: () => void; reject: (e: unknown) => void }[] =
    [];
  const send = vi.fn(
    (questionId: string, answer: unknown) =>
      new Promise<void>((resolve, reject) => {
        calls.push({ questionId, answer, resolve, reject });
      }),
  );
  return { send, calls };
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

afterEach(() => {
  vi.useRealTimers();
});

describe('createAnswerSaver', () => {
  it('keeps one request in flight per question and sends only the newest value next', async () => {
    const { send, calls } = controllableSend();
    const statuses: SaveStatus[] = [];
    const saver = createAnswerSaver({ send, onStatus: (s) => statuses.push(s), onError: vi.fn() });

    saver.save('q-1', { numericAnswer: '1' });
    saver.save('q-1', { numericAnswer: '12' });
    saver.save('q-1', { numericAnswer: '12,5' });
    await settle();

    // The first went out at once; the two typed after it are waiting, and the
    // older of them is never sent at all.
    expect(calls.map((c) => c.answer)).toEqual([{ numericAnswer: '1' }]);

    calls[0].resolve();
    await settle();
    expect(calls.map((c) => c.answer)).toEqual([{ numericAnswer: '1' }, { numericAnswer: '12,5' }]);

    calls[1].resolve();
    await saver.flush();
    expect(statuses.at(-1)).toBe('saved');
  });

  it('does not hold one question back for another', async () => {
    const { send, calls } = controllableSend();
    const saver = createAnswerSaver({ send, onStatus: vi.fn(), onError: vi.fn() });

    saver.save('q-1', { answerOptionId: 'a' });
    saver.save('q-2', { answerOptionId: 'b' });
    await settle();

    expect(calls.map((c) => c.questionId)).toEqual(['q-1', 'q-2']);
  });

  it('waits for typing to stop before sending a delayed answer', async () => {
    vi.useFakeTimers();
    const send = vi.fn(() => Promise.resolve());
    const saver = createAnswerSaver({ send, onStatus: vi.fn(), onError: vi.fn() });

    saver.save('q-1', { numericAnswer: '1' }, 400);
    await vi.advanceTimersByTimeAsync(200);
    saver.save('q-1', { numericAnswer: '12' }, 400);
    await vi.advanceTimersByTimeAsync(200);
    saver.save('q-1', { numericAnswer: '12,5' }, 400);
    expect(send).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(400);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith('q-1', { numericAnswer: '12,5' });
  });

  it('flushes a delayed answer at once and resolves after it is saved', async () => {
    vi.useFakeTimers();
    const { send, calls } = controllableSend();
    const saver = createAnswerSaver({ send, onStatus: vi.fn(), onError: vi.fn() });

    saver.save('q-1', { numericAnswer: '7' }, 400);
    let flushed = false;
    const flushing = saver.flush().then(() => {
      flushed = true;
    });
    await vi.advanceTimersByTimeAsync(0);

    expect(calls.map((c) => c.answer)).toEqual([{ numericAnswer: '7' }]);
    expect(flushed).toBe(false);

    calls[0].resolve();
    await flushing;
    expect(flushed).toBe(true);
  });

  it('reports a failed save and carries on with the next one', async () => {
    const { send, calls } = controllableSend();
    const statuses: SaveStatus[] = [];
    const onError = vi.fn();
    const saver = createAnswerSaver({ send, onStatus: (s) => statuses.push(s), onError });

    saver.save('q-1', { answerOptionId: 'a' });
    await settle();
    calls[0].reject(new Error('offline'));
    await saver.flush();

    expect(onError).toHaveBeenCalledTimes(1);
    expect(statuses.at(-1)).toBe('error');

    saver.save('q-1', { answerOptionId: 'b' });
    await settle();
    calls[1].resolve();
    await saver.flush();
    expect(statuses.at(-1)).toBe('saved');
  });

  it('sends nothing more and reports nothing once cancelled', async () => {
    const { send, calls } = controllableSend();
    const onError = vi.fn();
    const onStatus = vi.fn();
    const saver = createAnswerSaver({ send, onStatus, onError });

    saver.save('q-1', { numericAnswer: '1' });
    saver.save('q-1', { numericAnswer: '2' });
    await settle();
    saver.cancel();
    onStatus.mockClear();

    calls[0].reject(new Error('409'));
    await saver.flush();

    expect(calls).toHaveLength(1);
    expect(onError).not.toHaveBeenCalled();
    expect(onStatus).not.toHaveBeenCalled();
  });
});
