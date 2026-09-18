import { useEffect, useState } from 'react';
import { Alert } from '@/shared/ui/Alert';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Select, type SelectOption } from '@/shared/ui/Select';
import { pluralUk } from '@/shared/utils/format';
import { formatCountdown } from '@/features/quiz/lib/quiz-answers';
import { useSubjects, useTopics } from '@/features/quiz/hooks/use-content';
import { useChallenge, useLiveAvailability } from '@/features/duels/hooks/use-duels';
import { liveActions, useLiveStore } from '@/features/duels/live/live-client';
import { useServerCountdown } from '@/features/duels/live/use-server-countdown';
import { LIVE_COUNTS, LIVE_SECONDS, type LiveErrorCode } from '@/features/duels/live/live.types';

type Mode = 'random' | 'username';

const MODES: { value: Mode; label: string }[] = [
  { value: 'random', label: 'Випадковий суперник' },
  { value: 'username', label: 'За ніком' },
];

const questions = (count: number): string => `${count} ${pluralUk(count, 'питання', 'питання', 'питань')}`;

/**
 * Starting a live duel (docs/02-domain/duel.md §5.1): a random opponent, or
 * somebody named who is on the site right now.
 *
 * The times on offer come with how many questions fit each (§5.2), and a
 * combination that cannot be filled is switched off where it is chosen —
 * finding that out from an error after pressing the button is the worse way.
 */
export function LivePlaySection(): React.JSX.Element {
  const connection = useLiveStore((state) => state.connection);
  const queue = useLiveStore((state) => state.queue);
  const outgoing = useLiveStore((state) => state.outgoing);

  const searching = queue?.state === 'waiting';

  // The form stays mounted while the search or the challenge is on, only
  // hidden: a declined challenge should come back to the same nickname and
  // settings, not to an empty form.
  return (
    <>
      {searching && <Searching />}
      {!searching && outgoing && (
        <AwaitingAnswer username={outgoing.username} expiresAt={outgoing.expiresAt} />
      )}
      <div hidden={searching || outgoing !== null}>
        <LiveForm offline={connection !== 'ready'} />
      </div>
    </>
  );
}

function LiveForm({ offline }: { offline: boolean }): React.JSX.Element {
  const subjects = useSubjects();
  const lobby = useLiveStore((state) => state.lobby);
  const queue = useLiveStore((state) => state.queue);
  const challenge = useChallenge();

  const [mode, setMode] = useState<Mode>('random');
  const [subjectId, setSubjectId] = useState('');
  const [topicId, setTopicId] = useState('');
  const [username, setUsername] = useState('');
  const [seconds, setSeconds] = useState<number>(20);
  const [count, setCount] = useState<number>(10);
  const [error, setError] = useState<{ code: LiveErrorCode; message: string } | null>(null);
  const [sending, setSending] = useState(false);
  const [sentAsync, setSentAsync] = useState(false);

  const topics = useTopics(subjectId || undefined);
  const availability = useLiveAvailability(subjectId, mode === 'username' ? topicId : '');

  useEffect(() => setTopicId(''), [subjectId]);
  useEffect(() => setError(null), [mode, subjectId, topicId, seconds, count, username]);

  const fits = (candidate: number): number | null =>
    availability.data?.options.find((option) => option.seconds === candidate)?.available ?? null;
  const available = fits(seconds);
  const enough = available === null || available >= count;

  const waitingHere = lobby.waiting.filter((group) => group.subjectId === subjectId);

  const subjectOptions: SelectOption[] = [
    { value: '', label: 'Оберіть предмет…' },
    ...(subjects.data ?? []).map((subject) => ({ value: subject.id, label: subject.name })),
  ];
  const topicOptions: SelectOption[] = [
    { value: '', label: 'Усі теми' },
    ...(topics.data ?? []).map((topic) => ({ value: topic.id, label: topic.name })),
  ];

  const canSubmit =
    !offline && !sending && subjectId !== '' && enough && (mode === 'random' || username.trim() !== '');

  async function submit(): Promise<void> {
    setSending(true);
    setSentAsync(false);
    const settings = { subjectId, seconds, count };
    const ack =
      mode === 'random'
        ? await liveActions.joinQueue(settings)
        : await liveActions.sendInvite(username.trim(), {
            ...settings,
            ...(topicId ? { topicId } : {}),
          });
    setSending(false);
    if (!ack.ok) {
      setError({ code: ack.code, message: ack.message });
    }
  }

  function sendAsync(): void {
    challenge.mutate(
      {
        opponentUsername: username.trim(),
        subjectId,
        topicId: topicId || undefined,
        questionCount: count,
      },
      {
        onSuccess: () => {
          setError(null);
          setSentAsync(true);
        },
      },
    );
  }

  return (
    <div>
      <div
        role="radiogroup"
        aria-label="Як знайти суперника"
        className="border-border grid max-w-md grid-cols-2 border-b"
      >
        {MODES.map((entry) => (
          <button
            key={entry.value}
            type="button"
            role="radio"
            aria-checked={mode === entry.value}
            onClick={() => setMode(entry.value)}
            className={`focus-visible:ring-primary -mb-px border-b-2 pb-3 text-sm outline-none transition-colors focus-visible:ring-2 ${
              mode === entry.value
                ? 'border-primary text-text-primary font-medium'
                : 'text-text-muted hover:text-text-secondary border-transparent'
            }`}
          >
            {entry.label}
          </button>
        ))}
      </div>

      {queue?.state === 'timeout' && (
        <Alert variant="info" className="mt-6">
          За півтори хвилини ніхто не прийшов на такі самі налаштування. Спробуйте ще раз або викличте когось
          за ніком.
        </Alert>
      )}
      {queue?.state === 'failed' && (
        <Alert variant="error" className="mt-6">
          {queue.message}
        </Alert>
      )}
      {offline && <p className="text-text-muted mt-6 text-sm">З’єднуємося із сервером…</p>}

      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end">
        {mode === 'username' && (
          <div className="sm:w-56">
            <Input
              label="Нік суперника"
              placeholder="напр. oksana_k"
              autoComplete="off"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
          </div>
        )}
        <div className="sm:w-56">
          <Select
            label="Предмет"
            options={subjectOptions}
            value={subjectId}
            onChange={(event) => setSubjectId(event.target.value)}
          />
        </div>
        {mode === 'username' && (
          <div className="sm:w-56">
            <Select
              label="Тема"
              options={topicOptions}
              value={topicId}
              disabled={!subjectId || topics.isPending}
              onChange={(event) => setTopicId(event.target.value)}
            />
          </div>
        )}
      </div>

      <fieldset className="mt-6">
        <legend className="text-text-secondary mb-2 text-sm">Час на питання</legend>
        <div className="flex flex-wrap gap-2">
          {LIVE_SECONDS.map((option) => {
            const fit = fits(option);
            const closed = fit !== null && fit < LIVE_COUNTS[0];
            return (
              <Choice
                key={option}
                active={seconds === option}
                disabled={closed}
                onClick={() => setSeconds(option)}
                label={`${option} с`}
                hint={closed ? 'замало питань' : undefined}
              />
            );
          })}
        </div>
      </fieldset>

      <fieldset className="mt-5">
        <legend className="text-text-secondary mb-2 text-sm">Питань</legend>
        <div className="flex flex-wrap gap-2">
          {LIVE_COUNTS.map((option) => (
            <Choice
              key={option}
              active={count === option}
              disabled={available !== null && available < option}
              onClick={() => setCount(option)}
              label={String(option)}
            />
          ))}
        </div>
      </fieldset>

      {subjectId && available !== null && !enough && (
        <p className="text-text-muted mt-4 text-sm">
          {available === 0
            ? `За ${seconds} с тут не встигнути жодного питання — візьміть більше часу.`
            : `За ${seconds} с тут встигається лише ${questions(available)}. Візьміть більше часу або менше питань.`}
        </p>
      )}

      {mode === 'random' && waitingHere.length > 0 && (
        <p className="text-text-secondary mt-4 text-sm">
          Зараз чекають:{' '}
          {waitingHere.map((group, index) => (
            <span key={`${group.seconds}-${group.count}`}>
              {index > 0 && ', '}
              <button
                type="button"
                className="text-primary underline underline-offset-4"
                onClick={() => {
                  setSeconds(group.seconds);
                  setCount(group.count);
                }}
              >
                {group.seconds} с · {questions(group.count)}
              </button>
            </span>
          ))}
        </p>
      )}

      {error && (
        <Alert variant="error" className="mt-6">
          {error.message}
          {error.code === 'OFFLINE' && (
            <span className="mt-3 block">
              <Button size="sm" variant="secondary" onClick={sendAsync} isLoading={challenge.isPending}>
                Надіслати звичайний виклик
              </Button>
            </span>
          )}
        </Alert>
      )}
      {sentAsync && (
        <Alert variant="success" className="mt-6">
          Звичайний виклик надіслано — він з’явиться в списку нижче.
        </Alert>
      )}

      <div className="mt-8">
        <Button onClick={() => void submit()} disabled={!canSubmit} isLoading={sending}>
          {mode === 'random' ? 'Шукати суперника' : 'Викликати зараз'}
        </Button>
      </div>
    </div>
  );
}

function Choice({
  active,
  disabled,
  onClick,
  label,
  hint,
}: {
  active: boolean;
  disabled: boolean;
  onClick: () => void;
  label: string;
  hint?: string;
}): React.JSX.Element {
  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={disabled}
      title={hint}
      onClick={onClick}
      className={`focus-visible:ring-primary h-9 min-w-12 rounded-lg px-3 text-sm tabular-nums outline-none transition-colors focus-visible:ring-2 disabled:cursor-not-allowed disabled:line-through disabled:opacity-40 ${
        active && !disabled
          ? 'bg-primary font-medium text-white'
          : 'border-border text-text-secondary hover:bg-surface-elevated border'
      }`}
    >
      {label}
    </button>
  );
}

function Searching(): React.JSX.Element {
  const queue = useLiveStore((state) => state.queue);
  const subjects = useSubjects();
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick((tick) => tick + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  if (queue?.state !== 'waiting') {
    return <></>;
  }
  const subject = subjects.data?.find((one) => one.id === queue.subjectId)?.name;
  const elapsed = Math.max(
    0,
    Math.floor((Date.now() + useLiveStore.getState().clockOffset - queue.since) / 1000),
  );

  return (
    <div className="border-primary border-l pl-5">
      <p className="text-text-primary">
        Шукаємо суперника <span className="text-text-muted tabular-nums">{formatCountdown(elapsed)}</span>
      </p>
      <p className="text-text-muted mt-1 text-sm">
        {subject ?? 'Предмет'} · {queue.seconds} с на питання · {questions(queue.count)}
      </p>
      <Button className="mt-5" variant="ghost" size="sm" onClick={() => void liveActions.leaveQueue()}>
        Скасувати
      </Button>
    </div>
  );
}

function AwaitingAnswer({ username, expiresAt }: { username: string; expiresAt: number }): React.JSX.Element {
  const left = Math.ceil(useServerCountdown(expiresAt) / 1000);

  return (
    <div className="border-primary border-l pl-5">
      <p className="text-text-primary">
        Чекаємо на відповідь @{username} <span className="text-text-muted tabular-nums">{left} с</span>
      </p>
      <Button className="mt-5" variant="ghost" size="sm" onClick={() => void liveActions.cancelInvite()}>
        Скасувати виклик
      </Button>
    </div>
  );
}
