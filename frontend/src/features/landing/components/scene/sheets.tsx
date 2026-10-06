/**
 * What is printed on the sheets in the drawings: tasks in the formats of the
 * real exam and the three screens of a test, in the product's own vocabulary.
 *
 * Every answer here is correct and every wrong answer is wrong for a reason a
 * candidate would recognise — a page about exam preparation cannot afford a
 * mistake in its own examples.
 */

/** Історія: відповідність між подією та роком. */
export function HistorySheet(): React.JSX.Element {
  return (
    <>
      <div className="lp-q-meta">Історія України · завдання 21</div>
      <div className="lp-q-text">Установіть відповідність між подією та роком.</div>
      <div className="lp-q-row">
        <span>хрещення Русі</span>
        <span className="lp-chip">988 р.</span>
      </div>
      <div className="lp-q-row">
        <span>Полтавська битва</span>
        <span className="lp-chip">1709 р.</span>
      </div>
      <div className="lp-q-row">
        <span>аварія на ЧАЕС</span>
        <span className="lp-chip" data-on="">
          1986 р.
        </span>
      </div>
      <div className="lp-q-row">
        <span>Акт незалежності</span>
        <span className="lp-chip" data-empty="">
          —
        </span>
      </div>
    </>
  );
}

/** Математика: відкрита відповідь числом. */
export function MathSheet(): React.JSX.Element {
  return (
    <>
      <div className="lp-q-meta">Математика · завдання 17</div>
      <div className="lp-q-text">Розвʼяжіть рівняння 2x − 7 = 11.</div>
      <div className="lp-q-row">
        <span>Відповідь — число</span>
      </div>
      <div className="lp-field" style={{ width: '60%' }}>
        9
      </div>
    </>
  );
}

/** Українська: один варіант з чотирьох — апостроф. */
export function UkrainianSheet(): React.JSX.Element {
  return (
    <>
      <div className="lp-q-meta">Українська мова · завдання 3</div>
      <div className="lp-q-text">Позначте слово, що пишеться з апострофом.</div>
      <div className="lp-q-row">
        <span>А&nbsp;&nbsp;пір_я</span>
        <span className="lp-chip" data-on="">
          А
        </span>
      </div>
      <div className="lp-q-row">
        <span>Б&nbsp;&nbsp;цв_ях</span>
      </div>
      <div className="lp-q-row">
        <span>В&nbsp;&nbsp;св_ято</span>
      </div>
      <div className="lp-q-row">
        <span>Г&nbsp;&nbsp;тьм_яний</span>
      </div>
    </>
  );
}

/** Англійська: один варіант з чотирьох. */
export function EnglishSheet(): React.JSX.Element {
  return (
    <>
      <div className="lp-q-meta">Англійська мова · завдання 9</div>
      <div className="lp-q-text">Choose the correct option.</div>
      <div className="lp-q-row">
        <span>She ___ to school every day.</span>
      </div>
      <div className="lp-q-row">
        <span>A&nbsp;&nbsp;goes</span>
        <span className="lp-chip" data-on="">
          A
        </span>
      </div>
      <div className="lp-q-row">
        <span>B&nbsp;&nbsp;go · C&nbsp;&nbsp;going · D&nbsp;&nbsp;gone</span>
      </div>
    </>
  );
}

/** Крок 1: вибір теми й кількості питань — ті самі 5…25, що на екрані старту. */
export function TopicPickSheet(): React.JSX.Element {
  return (
    <>
      <div className="lp-q-meta">Математика</div>
      <div className="lp-small">Тема</div>
      <div className="lp-select">
        <span>Дроби та відсотки</span>
        <span style={{ color: 'var(--color-text-muted)' }}>▾</span>
      </div>
      <div className="lp-small">Скільки питань</div>
      <div className="lp-count">
        {[5, 10, 15, 20, 25].map((count) => (
          <span key={count} className="lp-chip" data-on={count === 15 ? '' : undefined}>
            {count}
          </span>
        ))}
      </div>
    </>
  );
}

/** Крок 2: питання у форматі іспиту, сьоме з п'ятнадцяти. */
export function ExamSheet(): React.JSX.Element {
  return (
    <>
      <div className="lp-q-meta">Математика · 7 з 15</div>
      <div className="lp-bars">
        {Array.from({ length: 15 }, (_, index) => (
          <span key={index} data-done={index < 6 ? '' : undefined} data-now={index === 6 ? '' : undefined} />
        ))}
      </div>
      <div className="lp-q-text" style={{ fontSize: 15, marginTop: 14 }}>
        Обчисліть ⅔ : ⁴⁄₉
      </div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <div className="lp-field" style={{ flex: 1 }}>
          1,5
        </div>
        <span className="lp-go">Далі →</span>
      </div>
    </>
  );
}

/**
 * Крок 3: розбір. The one wrong answer is a truncation — 3,45 for 3,4567 «до
 * сотих» — which is the mistake a candidate actually makes there.
 */
export function ReviewSheet(): React.JSX.Element {
  return (
    <>
      <div className="lp-q-meta">Розбір · 12 з 15</div>
      <div className="lp-rev">
        <b />
        <span>
          8<sup>⅔</sup>
        </span>
        <em>✓ 4</em>
      </div>
      <div className="lp-rev">
        <b />
        <span>⅔ : ⁴⁄₉</span>
        <em>✓ 1,5</em>
      </div>
      <div className="lp-rev" data-bad="">
        <b />
        <span>3,4567 до сотих</span>
        <em>✗ 3,45</em>
      </div>
      <div className="lp-rev">
        <b />
        <span>НСД(48, 60)</span>
        <em>✓ 12</em>
      </div>
    </>
  );
}
