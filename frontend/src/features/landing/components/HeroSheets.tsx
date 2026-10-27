import type { CSSProperties } from 'react';

/** The four subjects, bottom of the stack first; only the top one is read. */
const UNDER = [
  { subject: 'Англійська мова', task: 'Завдання 5' },
  { subject: 'Українська мова', task: 'Завдання 3' },
  { subject: 'Математика', task: 'Завдання 17' },
];

const EVENTS = ['хрещення Русі', 'Полтавська битва', 'аварія на ЧАЕС', 'Акт незалежності'];
const YEARS = ['1709 р.', '1991 р.', '988 р.', '1986 р.', '1240 р.'];
const LETTERS = ['А', 'Б', 'В', 'Г', 'Д'];
/** Which letter each event takes: 988 is В, 1709 is А, 1986 is Г, 1991 is Б. */
const ANSWERS = [2, 0, 3, 1];

const at = (index: number): CSSProperties => ({ '--i': index }) as CSSProperties;

/**
 * The hero's signature: the exam's own sheets, one per subject, dealt into a
 * stack on load, and the last answer on the top sheet marked the way a
 * candidate marks the NMT answer sheet.
 *
 * The task on the top sheet is a real one in the exam's matching format, and
 * every answer is right; Д, 1240, is the distractor the format always carries.
 * The sheets underneath show only their heads: a picture of four tasks at
 * once would be read as none.
 *
 * A figure of the product rather than a drawing of a thing, so it is labelled
 * as one for a screen reader, and its text is real text.
 */
export function HeroSheets(): React.JSX.Element {
  return (
    <figure
      className="lp-sheets"
      aria-label="Аркуші НМТ з історії, математики, української та англійської; на верхньому завдання на відповідність із заповненим бланком"
    >
      {UNDER.map((sheet, index) => (
        <div key={sheet.subject} className="lp-sheet" data-under="" style={at(3 - index)} aria-hidden="true">
          <div className="lp-sheet__head">
            <span>{sheet.subject}</span>
            <span>{sheet.task}</span>
          </div>
        </div>
      ))}

      <div className="lp-sheet" style={at(0)}>
        <div className="lp-sheet__head">
          <span>Історія України</span>
          <span>Завдання 21</span>
        </div>
        <p className="lp-sheet__task">Установіть відповідність між подією та роком.</p>
        <div className="lp-sheet__lists">
          <ol>
            {EVENTS.map((event, index) => (
              <li key={event}>
                <b>{index + 1}</b>
                {event}
              </li>
            ))}
          </ol>
          <ol>
            {YEARS.map((year, index) => (
              <li key={year}>
                <b>{LETTERS[index]}</b>
                {year}
              </li>
            ))}
          </ol>
        </div>
        <div className="lp-grid" aria-hidden="true">
          <span />
          {LETTERS.map((letter) => (
            <span key={letter}>{letter}</span>
          ))}
          {ANSWERS.map((answer, row) => (
            <Row key={row} row={row} answer={answer} last={row === ANSWERS.length - 1} />
          ))}
        </div>
      </div>
    </figure>
  );
}

function Row({ row, answer, last }: { row: number; answer: number; last: boolean }): React.JSX.Element {
  return (
    <>
      <span>{row + 1}</span>
      {LETTERS.map((letter, column) => (
        <i
          key={letter}
          data-on={column === answer ? '' : undefined}
          // The last mark lands after the sheets have, as the one beat of the
          // entrance; with reduced motion it is simply there.
          data-mark={last && column === answer ? '' : undefined}
        />
      ))}
    </>
  );
}
