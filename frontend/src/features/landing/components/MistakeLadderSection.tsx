import type { CSSProperties } from 'react';
import { SECTION_CONTAINER } from '@/features/landing/constants';

const DAYS = 12;

/**
 * One question's road off the ladder, in days from the mistake: wrong on day
 * 0, right on day 1, 4 and 11, and cleared. The rungs are the schedule's own
 * (1, 3 and 7 days, backend REVIEW_LADDER_DAYS); the days are where each
 * answer lands on it.
 */
const ROWS: {
  label: string;
  short: string;
  from?: number;
  to?: number;
  at?: number;
  wrong?: boolean;
  cleared?: boolean;
}[] = [
  { label: 'Помилка', short: 'Помилка', at: 0, wrong: true },
  { label: 'Через 1 день', short: '1 день', from: 0, to: 1, at: 1 },
  { label: 'Через 3 дні', short: '3 дні', from: 1, to: 4, at: 4 },
  { label: 'Через 7 днів', short: '7 днів', from: 4, to: 11, at: 11 },
  { label: 'Виправлено', short: 'Виправлено', from: 11, to: 12, cleared: true },
];

/** The days something happens on: the only ones a phone has room to number. */
const MARKED = new Set(ROWS.flatMap((row) => [row.at, row.to]).filter((day) => day !== undefined));

const vars = (values: Record<string, number | undefined>): CSSProperties => values as CSSProperties;

export function MistakeLadderSection(): React.JSX.Element {
  return (
    <section aria-labelledby="ladder-title" className="bg-surface-elevated py-[clamp(96px,10vw,152px)]">
      <div className={SECTION_CONTAINER}>
        <div className="grid gap-8 min-[60rem]:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] min-[60rem]:items-end">
          <h2 id="ladder-title" className="lp-h2">
            Помилка повертається, доки її не виправиш.
          </h2>
          <p className="text-text-secondary max-w-[44ch] text-lg leading-relaxed">
            Неправильна відповідь ставить питання на першу сходинку. Правильна піднімає на наступну, а нова
            помилка повертає на початок.
          </p>
        </div>

        <div className="mt-[clamp(48px,6vw,80px)]">
          {/* A real table laid out on a grid. The rows keep their roles
              explicitly: `display: contents` on a row has cost it its role in
              some browsers. */}
          <table className="lp-scale">
            <caption className="sr-only">Шлях одного питання драбиною помилок, у днях від помилки</caption>
            <thead>
              <tr role="row">
                <th scope="col" role="columnheader">
                  День
                </th>
                {Array.from({ length: DAYS }, (_, day) => (
                  <th
                    key={day}
                    scope="col"
                    role="columnheader"
                    className="figure"
                    data-minor={MARKED.has(day) ? undefined : ''}
                  >
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.label} role="row">
                  <th scope="row" role="rowheader">
                    <span className="lp-scale__long">{row.label}</span>
                    <span className="lp-scale__short">{row.short}</span>
                  </th>
                  <td className="lp-scale__track" colSpan={DAYS} role="cell" style={vars({ '--days': DAYS })}>
                    {row.from !== undefined && row.to !== undefined && (
                      <i
                        className="lp-scale__bar"
                        data-cleared={row.cleared ? '' : undefined}
                        style={vars({ '--from': row.from, '--to': row.to })}
                      />
                    )}
                    {row.at !== undefined && (
                      <i
                        className="lp-scale__dot"
                        data-wrong={row.wrong ? '' : undefined}
                        style={vars({ '--at': row.at })}
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="label mt-5">
          Правильна відповідь поза повторенням теж рахується: питання, яке ви знову зустріли в тесті й
          розв'язали, піднімається так само.
        </p>
      </div>
    </section>
  );
}
