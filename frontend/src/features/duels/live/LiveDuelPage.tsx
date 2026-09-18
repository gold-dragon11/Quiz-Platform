import { useEffect, useState } from 'react';
import { generatePath, Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { ROUTES } from '@/shared/constants/routes';
import { QuestionType } from '@/shared/types/enums';
import { Button } from '@/shared/ui/Button';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { Skeleton } from '@/shared/ui/Skeleton';
import { pluralUk } from '@/shared/utils/format';
import { QuestionCard } from '@/features/quiz/components/QuestionCard';
import { AnswerReview } from '@/features/quiz/components/ResultReview';
import type { SelectedAnswer } from '@/features/quiz/types/quiz.types';
import { liveActions, useLiveStore } from '@/features/duels/live/live-client';
import { useServerCountdown } from '@/features/duels/live/use-server-countdown';
import type { LiveGameView, LivePlayerView } from '@/features/duels/live/live.types';

/**
 * `/duels/live/:duelId` (RequireAuth, learners) — a live duel as it is played
 * (docs/02-domain/duel.md §5.3).
 *
 * Everything on it is the server's latest word: the phase, the deadline, the
 * question dealt for this player, the score. The screen sends answers and
 * shows what comes back; it decides nothing, and a reload or a dropped network
 * lands on the same state because the server sends it again on reconnect.
 */
export function LiveDuelPage(): React.JSX.Element {
  const { duelId = '' } = useParams();
  const game = useLiveStore((state) => state.game);
  const connection = useLiveStore((state) => state.connection);
  const [asked, setAsked] = useState<'no' | 'asking' | 'none'>('no');

  const current = game?.duelId === duelId ? game : null;

  // After a reload the socket reconnects and the server resends the game on
  // its own; asking once more covers the case where it arrived before this
  // screen was listening.
  useEffect(() => {
    if (current || connection !== 'ready' || asked !== 'no') {
      return;
    }
    setAsked('asking');
    void liveActions.sync().then((ack) => {
      if (!ack.ok || !ack.inGame) {
        setAsked('none');
      }
    });
  }, [current, connection, asked]);

  // A finished game stays on screen until it is left, then is let go.
  useEffect(
    () => () => {
      if (useLiveStore.getState().game?.phase === 'finished') {
        liveActions.clearGame();
      }
    },
    [],
  );

  if (!current) {
    if (asked === 'none') {
      // Not being played: whatever it was is in the ordinary duel page.
      return <Navigate to={generatePath(ROUTES.duel, { duelId })} replace />;
    }
    return (
      <div className="mx-auto max-w-3xl">
        <Skeleton className="h-16" />
        <Skeleton className="mt-10 h-64" />
      </div>
    );
  }

  return <Game game={current} />;
}

function Game({ game }: { game: LiveGameView }): React.JSX.Element {
  const [confirmForfeit, setConfirmForfeit] = useState(false);

  return (
    <div className="mx-auto max-w-3xl">
      <Scoreline game={game} />

      {game.phase === 'countdown' && <Countdown game={game} />}
      {game.phase === 'question' && <OpenQuestion game={game} key={game.question?.id} />}
      {game.phase === 'reveal' && <Reveal game={game} />}
      {game.phase === 'finished' && <Finished game={game} />}

      {game.phase !== 'finished' && (
        <div className="border-border mt-16 border-t pt-6">
          <button
            type="button"
            onClick={() => setConfirmForfeit(true)}
            className="text-text-muted hover:text-error text-sm underline underline-offset-4"
          >
            Здатися
          </button>
        </div>
      )}

      <ConfirmDialog
        open={confirmForfeit}
        title="Здатися?"
        description="Гра закінчиться зараз, і перемога дістанеться суперникові, хоч би який був рахунок."
        confirmLabel="Здатися"
        confirmVariant="danger"
        onConfirm={() => {
          setConfirmForfeit(false);
          void liveActions.forfeit();
        }}
        onCancel={() => setConfirmForfeit(false)}
      />
    </div>
  );
}

const nameOf = (player: LivePlayerView): string =>
  player.displayName ?? (player.username ? `@${player.username}` : 'Суперник');

/** Both names and the score, the way a match is announced. */
function Scoreline({ game }: { game: LiveGameView }): React.JSX.Element {
  return (
    <header className="border-border border-b pb-6">
      <p className="text-text-muted text-xs tracking-[0.18em] uppercase">
        {game.subject.name} · {game.secondsPerQuestion} с на питання
      </p>
      <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-end gap-4">
        <div className="min-w-0">
          <p className="text-text-primary truncate font-medium">{nameOf(game.me)}</p>
          <p className="text-text-muted text-xs">ви</p>
        </div>
        <p
          className="font-display text-text-primary text-4xl leading-none font-bold tabular-nums"
          aria-label={`Рахунок ${game.me.score} на ${game.opponent.score}`}
        >
          {game.me.score}
          <span className="text-text-muted mx-2 font-normal">:</span>
          {game.opponent.score}
        </p>
        <div className="min-w-0 text-right">
          <p className="text-text-primary truncate font-medium">{nameOf(game.opponent)}</p>
          <p className={`text-xs ${game.opponent.connected ? 'text-text-muted' : 'text-error'}`}>
            {game.opponent.connected ? 'суперник' : 'зв’язок втрачено'}
          </p>
        </div>
      </div>
    </header>
  );
}

function Countdown({ game }: { game: LiveGameView }): React.JSX.Element {
  const left = Math.ceil(useServerCountdown(game.deadline) / 1000);

  return (
    <section className="py-20 text-center">
      <p className="font-display text-text-primary text-7xl font-bold tabular-nums" aria-live="polite">
        {Math.max(1, left)}
      </p>
      <p className="text-text-muted mt-6 text-sm">
        {game.questionCount} {pluralUk(game.questionCount, 'питання', 'питання', 'питань')} — перше вже
        відкривається
      </p>
    </section>
  );
}

/** The shrinking line and the seconds left on the open question. */
function Clock({ game }: { game: LiveGameView }): React.JSX.Element {
  const leftMs = useServerCountdown(game.deadline);
  const share = Math.min(1, leftMs / (game.secondsPerQuestion * 1000));
  const low = leftMs <= 3000;

  return (
    <div className="mt-8">
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-text-muted">
          Питання {game.index + 1} з {game.questionCount}
        </span>
        <span
          className={`tabular-nums ${low ? 'text-error font-medium' : 'text-text-secondary'}`}
          role="timer"
        >
          {Math.ceil(leftMs / 1000)} с
        </span>
      </div>
      <div className="bg-border mt-2 h-1 w-full overflow-hidden rounded-full">
        <div
          className={`h-full ${low ? 'bg-error' : 'bg-primary'}`}
          style={{ width: `${share * 100}%`, transition: 'width 100ms linear' }}
        />
      </div>
    </div>
  );
}

/** Only a complete answer can be sent; a half-placed ordering is not one. */
function isComplete(type: string, answer: SelectedAnswer | undefined, optionCount: number): boolean {
  if (!answer) {
    return false;
  }
  if (type === QuestionType.ORDERING) {
    return Array.isArray(answer.sequence) && answer.sequence.length === optionCount;
  }
  if (type === QuestionType.MULTIPLE_CHOICE) {
    return Array.isArray(answer.answerOptionIds) && answer.answerOptionIds.length > 0;
  }
  if (type === QuestionType.NUMERIC) {
    // Typed as text, as the quiz screen keeps it; the server reads the number.
    const value = answer.numericAnswer;
    return typeof value === 'string' ? value.trim() !== '' : typeof value === 'number';
  }
  if (type === QuestionType.MATCHING) {
    return Array.isArray(answer.pairs) && answer.pairs.length > 0;
  }
  return true;
}

const REJECTED: Record<string, string> = {
  TOO_LATE: 'Час на це питання вже вийшов.',
  NOT_OPEN: 'Час на це питання вже вийшов.',
  ALREADY_ANSWERED: 'Відповідь на це питання вже зарахована.',
  INVALID: 'Таку відповідь не вдалося прийняти — перевірте її.',
  WRONG_QUESTION: 'Питання вже змінилося.',
};

function OpenQuestion({ game }: { game: LiveGameView }): React.JSX.Element | null {
  const question = game.question;
  const [draft, setDraft] = useState<SelectedAnswer | undefined>(undefined);
  const [sending, setSending] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  if (!question) {
    return null;
  }
  const answered = game.myAnswer !== null;
  const shown = game.myAnswer ?? draft;
  const immediate = question.type === QuestionType.SINGLE_CHOICE;

  async function send(answer: SelectedAnswer): Promise<void> {
    if (!question || sending || answered) {
      return;
    }
    setSending(true);
    setNote(null);
    const ack = await liveActions.answer(question.id, answer);
    setSending(false);
    if (!ack.ok) {
      setNote(ack.message);
    } else if (!ack.accepted) {
      setNote(REJECTED[ack.reason] ?? null);
    }
  }

  return (
    <section>
      <Clock game={game} />

      <div className="mt-8">
        <QuestionCard
          question={question}
          answer={shown}
          disabled={answered || sending}
          onAnswerChange={(answer) => {
            setDraft(answer);
            // A single choice is one tap: the first one is the answer.
            if (immediate) {
              void send(answer);
            }
          }}
        />
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        <p className="text-text-muted text-sm" aria-live="polite">
          {answered
            ? game.opponent.answered
              ? 'Обоє відповіли'
              : 'Відповідь прийнято. Суперник ще думає.'
            : game.opponent.answered
              ? 'Суперник уже відповів'
              : immediate
                ? 'Перший вибір — остаточний'
                : 'Відповідь надсилається один раз'}
        </p>
        {!immediate && !answered && (
          <Button
            onClick={() => draft && void send(draft)}
            disabled={!isComplete(question.type, draft, question.answerOptions.length)}
            isLoading={sending}
          >
            Відповісти
          </Button>
        )}
      </div>
      {note && <p className="text-error mt-3 text-sm">{note}</p>}
    </section>
  );
}

function outcomeLine(label: string, outcome: { isCorrect: boolean; seconds: number } | null): string {
  if (!outcome) {
    return `${label}: без відповіді`;
  }
  const seconds = outcome.seconds.toLocaleString('uk-UA', { maximumFractionDigits: 1 });
  return `${label}: ${outcome.isCorrect ? 'правильно' : 'неправильно'}, ${seconds} с`;
}

function Reveal({ game }: { game: LiveGameView }): React.JSX.Element | null {
  const { question, reveal } = game;
  const left = Math.ceil(useServerCountdown(game.deadline) / 1000);
  if (!question || !reveal) {
    return null;
  }
  const last = game.index + 1 >= game.questionCount;

  return (
    <section className="mt-8">
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-text-muted">
          Питання {game.index + 1} з {game.questionCount}
        </span>
        <span className="text-text-muted tabular-nums">
          {last ? 'Підсумок' : 'Наступне'} за {Math.max(1, left)} с
        </span>
      </div>

      <h2 className="text-text-primary mt-6 text-lg leading-relaxed whitespace-pre-wrap">{question.title}</h2>
      <div className="mt-5">
        <AnswerReview
          question={{
            ...question,
            passage: null,
            submittedAnswer: game.myAnswer,
            correctAnswer: reveal.correctAnswer,
            isCorrect: reveal.mine?.isCorrect ?? false,
            explanation: null,
          }}
        />
      </div>

      <div className="border-border mt-6 flex flex-col gap-1 border-l pl-5 text-sm">
        <p className={reveal.mine?.isCorrect ? 'text-success' : 'text-text-secondary'}>
          {outcomeLine('Ви', reveal.mine)}
        </p>
        <p className="text-text-secondary">{outcomeLine(nameOf(game.opponent), reveal.theirs)}</p>
      </div>
    </section>
  );
}

const HEADLINE: Record<string, string> = {
  WIN: 'Перемога',
  LOSS: 'Поразка',
  DRAW: 'Нічия',
};

function Finished({ game }: { game: LiveGameView }): React.JSX.Element | null {
  const navigate = useNavigate();
  const result = game.result;
  if (!result) {
    return (
      <p className="text-text-muted py-20 text-center text-sm" aria-live="polite">
        Підбиваємо рахунок…
      </p>
    );
  }

  const why =
    result.forfeit === 'ME'
      ? 'Ви здалися.'
      : result.forfeit === 'OPPONENT'
        ? `${nameOf(game.opponent)} — здача.`
        : game.me.score === game.opponent.score && result.outcome !== 'DRAW'
          ? 'Рахунок рівний — вирішив час.'
          : null;

  return (
    <section className="py-12">
      <h1
        className={`font-display text-5xl font-bold ${
          result.outcome === 'WIN' ? 'text-primary' : 'text-text-primary'
        }`}
      >
        {HEADLINE[result.outcome]}
      </h1>
      {why && <p className="text-text-secondary mt-3">{why}</p>}

      <div className="mt-10 flex flex-wrap gap-3">
        <Button onClick={() => navigate(generatePath(ROUTES.quizResult, { sessionId: result.sessionId }))}>
          Мій розбір
        </Button>
        <Button variant="secondary" onClick={() => navigate(ROUTES.duels)}>
          Ще одна гра
        </Button>
      </div>
      <p className="text-text-muted mt-6 text-sm">
        Дуель збережено в{' '}
        <Link
          to={generatePath(ROUTES.duel, { duelId: game.duelId })}
          className="text-primary underline underline-offset-4"
        >
          списку ваших дуелей
        </Link>
        .
      </p>
    </section>
  );
}
