import { FigureGrid } from '@/shared/ui/FigureGrid';
import { pluralUk } from '@/shared/utils/format';
import type { NmtResultView } from '@/features/quiz/types/quiz.types';
import { XpReward } from '@/features/quiz/components/XpReward';
import { labelCovers } from '@/features/quiz/lib/answer-rows';

/**
 * A mock sitting scored the way the exam scores it: the 100–200 score first,
 * because that is the number a student compares with an admissions threshold,
 * then the test points it came from, then every task with what it earned.
 *
 * The per-task row is the useful part. "23 з 32" says how it went; a row that
 * shows task 18 at 1 of 3 and task 22 at 0 says where the next week goes.
 */
export function NmtResult({
  nmt,
  xpEarned,
  blankRows,
  level = 1,
}: {
  nmt: NmtResultView;
  xpEarned: number;
  /** Tasks — rows of the answer sheet — left without an answer. */
  blankRows: number;
  /** 1 for a paper sat alone; 2 for each paper of a joint block, under the block's own heading. */
  level?: 1 | 2;
}): React.JSX.Element {
  const passed = nmt.scaledScore !== null;
  const taskCount = nmt.tasks.reduce((sum, task) => sum + labelCovers(task.label), 0);
  const lostNothing = nmt.tasks.filter((task) => task.points === task.maxPoints).length;
  // Where every task is worth exactly a point — English — tasks without loss
  // are the test points again, and the figure beside them would repeat them.
  // What the reader does not know yet is how much was simply left blank.
  const pointPerTask = nmt.maxTestPoints === taskCount;
  const Title = level === 1 ? 'h1' : 'h2';
  const Section = level === 1 ? 'h2' : 'h3';

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <Title
            className={`text-text-primary font-display leading-tight ${level === 1 ? 'text-2xl sm:text-3xl' : 'text-xl'}`}
          >
            {nmt.title}
          </Title>
          <p className="text-text-primary font-display mt-6 text-6xl leading-none lining-nums sm:text-7xl">
            {passed ? nmt.scaledScore : nmt.testPoints}
          </p>
          <p className="text-text-secondary mt-4 text-sm">
            {passed
              ? 'балів за шкалою від 100 до 200'
              : `тестових ${pluralUk(nmt.testPoints, 'бал', 'бали', 'балів')}, поріг не подолано, потрібно щонайменше ${nmt.threshold}`}
          </p>
        </div>
        {xpEarned > 0 && <XpReward xp={xpEarned} />}
      </div>

      <FigureGrid
        className="mt-8"
        figures={[
          { value: nmt.testPoints, label: `з ${nmt.maxTestPoints} тестових балів` },
          pointPerTask
            ? { value: blankRows, label: `з ${taskCount} завдань без відповіді` }
            : { value: lostNothing, label: `з ${taskCount} завдань без втрат` },
        ]}
      />

      <section className="mt-10">
        <Section className="section-title">Бали за завданнями</Section>
        <ol className="border-border mt-4 grid grid-cols-6 border-t border-l sm:grid-cols-11">
          {nmt.tasks.map((task) => (
            <li
              key={task.number}
              className="border-border flex flex-col items-center gap-1 border-r border-b py-2.5"
              aria-label={`Завдання ${task.label}: ${task.points} з ${task.maxPoints}`}
            >
              <span className="text-text-muted text-[11px] tabular-nums">{task.label}</span>
              <span
                className={`text-sm tabular-nums ${
                  task.points === 0
                    ? 'text-error'
                    : task.points < task.maxPoints
                      ? 'text-text-secondary'
                      : 'text-text-primary'
                }`}
              >
                {task.points}
                {task.maxPoints > 1 && <span className="text-text-muted">/{task.maxPoints}</span>}
              </span>
            </li>
          ))}
        </ol>
        <p className="text-text-muted mt-4 max-w-2xl text-xs">{nmt.scaleSource}.</p>
      </section>
    </div>
  );
}
