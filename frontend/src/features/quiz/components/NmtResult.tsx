import { FigureGrid } from '@/shared/ui/FigureGrid';
import { pluralUk } from '@/shared/utils/format';
import type { NmtResultView } from '@/features/quiz/types/quiz.types';
import { XpReward } from '@/features/quiz/components/XpReward';

/**
 * A mock sitting scored the way the exam scores it: the 100–200 score first,
 * because that is the number a student compares with an admissions threshold,
 * then the test points it came from, then every task with what it earned.
 *
 * The per-task row is the useful part. "23 з 32" says how it went; a row that
 * shows task 18 at 1 of 3 and task 22 at 0 says where the next week goes.
 */
export function NmtResult({ nmt, xpEarned }: { nmt: NmtResultView; xpEarned: number }): React.JSX.Element {
  const passed = nmt.scaledScore !== null;
  const lostNothing = nmt.tasks.filter((task) => task.points === task.maxPoints).length;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-text-muted text-xs tracking-[0.18em] uppercase">{nmt.title}</p>
          <p className="text-text-primary font-display mt-3 text-6xl leading-none font-bold lining-nums sm:text-7xl">
            {passed ? nmt.scaledScore : nmt.testPoints}
          </p>
          <p className="text-text-secondary mt-4 text-sm">
            {passed
              ? 'балів за шкалою 100–200'
              : `тестових ${pluralUk(nmt.testPoints, 'бал', 'бали', 'балів')} — поріг не подолано, потрібно щонайменше ${nmt.threshold}`}
          </p>
        </div>
        {xpEarned > 0 && <XpReward xp={xpEarned} />}
      </div>

      <FigureGrid
        className="mt-8"
        figures={[
          { value: nmt.testPoints, label: `з ${nmt.maxTestPoints} тестових балів` },
          {
            value: lostNothing,
            label: `з ${nmt.tasks.length} завдань без втрат`,
          },
        ]}
      />

      <section className="mt-10">
        <h2 className="text-text-muted text-xs tracking-[0.18em] uppercase">Бали за завданнями</h2>
        <ol className="border-border mt-4 grid grid-cols-6 border-t border-l sm:grid-cols-11">
          {nmt.tasks.map((task) => (
            <li
              key={task.number}
              className="border-border flex flex-col items-center gap-1 border-r border-b py-2.5"
              aria-label={`Завдання ${task.number}: ${task.points} з ${task.maxPoints}`}
            >
              <span className="text-text-muted text-[11px] tabular-nums">{task.number}</span>
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
