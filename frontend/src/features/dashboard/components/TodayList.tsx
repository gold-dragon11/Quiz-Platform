import { generatePath, Link } from 'react-router-dom';
import { ROUTES } from '@/shared/constants/routes';
import { Skeleton } from '@/shared/ui/Skeleton';
import { formatShortDate, pluralUk } from '@/shared/utils/format';
import { useActiveQuiz } from '@/features/quiz/hooks/use-quiz';
import { useMistakeReviewSummary } from '@/features/mistake-review/hooks/use-mistake-review';
import { useStudentAssignments } from '@/features/assignments/hooks/use-assignments';
import { useDuels } from '@/features/duels/hooks/use-duels';
import { playerName, stanceOf, theirSide } from '@/features/duels/lib/duel-state';
import { useStudy } from '@/features/user/hooks/use-study';
import { FirstStep } from '@/features/dashboard/components/FirstStep';

interface TodayItem {
  key: string;
  to: string;
  /** What kind of thing it is: the column a reader scans first. */
  kind: string;
  title: string;
  /** When it is owed, in the column on the right. */
  when: string;
  /** Omitted when the title already says everything. */
  detail?: string;
  /** `now` carries the accent rule; `soon` is worth knowing, not doing today. */
  urgency: 'now' | 'soon';
}

/**
 * What the learner should do next, in the order the product's own rules force.
 *
 * This screen used to be a display case: level, XP, progress per subject,
 * recent activity — every one of which the statistics page already showed, and
 * none of which told anybody what to do. The numbers moved there; what is left
 * here is a list of things with a deadline attached.
 *
 * The order is not a preference. An unfinished session occupies the single
 * active-session slot, so nothing else can even be started until it is done —
 * it goes first because the product will refuse everything else anyway. Then
 * work whose deadline has passed, then work whose deadline has not, then the
 * review ladder, then duels, which are the only entry nobody loses anything by
 * ignoring.
 */
export function TodayList({ userId }: { userId: string }): React.JSX.Element {
  const activeQuiz = useActiveQuiz();
  const review = useMistakeReviewSummary();
  const assignments = useStudentAssignments();
  const duels = useDuels();
  const study = useStudy();

  const loading =
    activeQuiz.isPending || review.isPending || assignments.isPending || duels.isPending || study.isPending;

  if (loading) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
    );
  }

  const items: TodayItem[] = [];

  if (activeQuiz.data) {
    items.push({
      key: 'active',
      to: generatePath(ROUTES.quizSession, { sessionId: activeQuiz.data.sessionId }),
      kind: 'Тест',
      title: 'Незавершений тест',
      when: 'зараз',
      // Homework is not in this list: it has its own slot and starts regardless.
      detail: 'Поки він відкритий, новий тест, пробний чи дуель не почнуться. Домашки це не стосується.',
      urgency: 'now',
    });
  }

  const overdue = (assignments.data ?? []).filter((one) => one.status === 'OVERDUE');
  for (const assignment of overdue) {
    items.push({
      key: `overdue-${assignment.id}`,
      to: generatePath(ROUTES.assignment, { assignmentId: assignment.id }),
      kind: assignment.mockExam ? 'Пробний НМТ' : 'Домашка',
      title: assignment.title,
      when: `минув ${formatShortDate(assignment.dueAt)}`,
      detail: `${assignment.group.name}. Дедлайн минув, але здати все одно можна.`,
      urgency: 'now',
    });
  }

  const open = (assignments.data ?? [])
    .filter((one) => one.status === 'OPEN')
    .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());
  for (const assignment of open) {
    items.push({
      key: `open-${assignment.id}`,
      to: generatePath(ROUTES.assignment, { assignmentId: assignment.id }),
      kind: assignment.mockExam ? 'Пробний НМТ' : 'Домашка',
      title: assignment.title,
      when: `до ${formatShortDate(assignment.dueAt)}`,
      detail: assignment.group.name,
      urgency: 'now',
    });
  }

  const due = review.data?.due ?? 0;
  if (due > 0) {
    items.push({
      key: 'review',
      to: ROUTES.mistakeReview,
      kind: 'Повторення',
      when: 'сьогодні',
      title: `${due} ${pluralUk(due, 'помилка чекає', 'помилки чекають', 'помилок чекає')} повторення`,
      urgency: 'now',
    });
  }

  for (const duel of duels.data ?? []) {
    const stance = stanceOf(duel, userId);
    if (stance !== 'INVITE_RECEIVED' && stance !== 'MY_TURN') {
      continue;
    }
    items.push({
      key: `duel-${duel.id}`,
      to: generatePath(ROUTES.duel, { duelId: duel.id }),
      kind: 'Дуель',
      when: `до ${formatShortDate(duel.expiresAt)}`,
      title:
        stance === 'INVITE_RECEIVED'
          ? `${playerName(theirSide(duel, userId))} викликає на дуель`
          : `Дуель з ${playerName(theirSide(duel, userId))}: ваш хід`,
      detail: `${duel.subject.name}, ${duel.questionCount} ${pluralUk(duel.questionCount, 'питання', 'питання', 'питань')}`,
      urgency: 'soon',
    });
  }

  if (items.length === 0) {
    // A learner who has never finished a test has nothing to be told is not
    // due; what they lack is a first step.
    if (study.data?.needsOnboarding) {
      return <FirstStep />;
    }
    return <NothingDue scheduled={review.data?.scheduled ?? 0} />;
  }

  return (
    // A queue read in columns: what kind of thing, the thing, when it is owed.
    // As one left-hand column of titles the list used a third of the screen
    // and made the reader open each row to learn its deadline.
    <ul className="divide-border border-border divide-y border-b">
      {items.map((item) => (
        <li key={item.key}>
          {/* No trailing "open" label: every row opens, so the word carried
              no information and repeated down the whole column. */}
          <Link
            to={item.to}
            className={`hover:bg-surface-elevated grid grid-cols-[minmax(0,1fr)_auto] gap-x-6 gap-y-1 border-l-2 py-5 pr-3 pl-4 transition-colors sm:grid-cols-[8.5rem_minmax(0,1fr)_auto] ${
              item.urgency === 'now' ? 'border-primary' : 'border-transparent'
            }`}
          >
            <span className="text-text-muted text-sm sm:pt-0.5">{item.kind}</span>
            <span className="text-text-secondary text-right text-sm tabular-nums sm:order-last sm:pt-0.5">
              {item.when}
            </span>
            <span className="col-span-2 min-w-0 sm:col-span-1">
              <span className="text-text-primary block truncate font-medium">{item.title}</span>
              {item.detail && <span className="text-text-muted mt-1 block text-xs">{item.detail}</span>}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/**
 * An empty list here is the good outcome, so it does not apologise. It names
 * the things worth doing when nothing is owed — and none of them is a number
 * to admire.
 *
 * Mistakes still on the ladder but not yet due lead the suggestions when there
 * are any. The wording above is accurate — nothing is due *by the schedule* —
 * but a reader with a dozen unfixed mistakes was offered a mock exam and a
 * fresh quiz, and never told that the most useful thing available is already
 * waiting. The schedule decides when a review is *owed*; it was never meant to
 * stop anyone doing one early.
 */
function NothingDue({ scheduled }: { scheduled: number }): React.JSX.Element {
  return (
    <div className="pt-2">
      <p className="text-text-primary font-display text-2xl">На сьогодні нічого не горить.</p>
      <p className="text-text-secondary mt-4 max-w-2xl text-sm">
        Ні прострочених робіт, ні помилок за розкладом. Якщо є час, ось що дає найбільше:
      </p>
      <ul className="mt-6 flex flex-col gap-3">
        {scheduled > 0 && (
          <li>
            <Link to={ROUTES.mistakeReview} className="text-primary text-sm underline underline-offset-4">
              Робота над помилками
            </Link>
            <span className="text-text-muted text-sm">
              : {scheduled} {pluralUk(scheduled, 'помилка', 'помилки', 'помилок')} ще на драбині; розклад каже
              «пізніше», але чекати не обовʼязково
            </span>
          </li>
        )}
        <li>
          <Link to={ROUTES.mockExam} className="text-primary text-sm underline underline-offset-4">
            Пробний НМТ
          </Link>
          <span className="text-text-muted text-sm">: робота цілком, на один годинник, як на іспиті</span>
        </li>
        <li>
          <Link to={ROUTES.quiz} className="text-primary text-sm underline underline-offset-4">
            Звичайний тест
          </Link>
          <span className="text-text-muted text-sm">: обрати предмет і тему самому</span>
        </li>
      </ul>
    </div>
  );
}
