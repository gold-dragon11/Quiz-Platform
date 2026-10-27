import { THEME_OPTIONS, useThemeStore, type ThemePreference } from '@/stores/theme-store';

/**
 * The theme choice (docs/07-design/colors.md §3).
 *
 * Three radio buttons rather than a switch, because a switch has two
 * positions and there are three answers — «як у системі» is the one a reader
 * who dims their laptop in the evening actually wants, and a switch cannot
 * offer it.
 *
 * It is a radiogroup, not three buttons: arrow keys move between the options
 * and the screen reader announces «2 з 3», which is what this control is.
 *
 * Nothing is saved to the server. The theme belongs to the browser it was
 * chosen in — the same person on a phone in daylight and a laptop at night
 * wants different answers, and one account-wide setting would be wrong on one
 * of them. That is also why the demo account may change it: it changes
 * nothing anyone else will see.
 */
export function AppearanceSection(): React.JSX.Element {
  const preference = useThemeStore((state) => state.preference);
  const setPreference = useThemeStore((state) => state.setPreference);

  const move = (event: React.KeyboardEvent, index: number): void => {
    const step =
      event.key === 'ArrowRight' || event.key === 'ArrowDown'
        ? 1
        : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
          ? -1
          : 0;
    if (step === 0) {
      return;
    }
    event.preventDefault();
    const next = THEME_OPTIONS[(index + step + THEME_OPTIONS.length) % THEME_OPTIONS.length];
    setPreference(next.value);
    document.getElementById(`theme-${next.value}`)?.focus();
  };

  return (
    <section>
      <h2 className="section-title border-border border-b pb-3">Вигляд</h2>
      <p className="text-text-secondary mt-6 max-w-xl text-sm">
        Тема зберігається в цьому браузері, а не в акаунті, тож на телефоні вдень і за ноутбуком увечері можна
        тримати різну.
      </p>

      <div role="radiogroup" aria-label="Тема інтерфейсу" className="mt-6 flex flex-wrap gap-2">
        {THEME_OPTIONS.map((option, index) => (
          <ThemeOption
            key={option.value}
            option={option}
            selected={option.value === preference}
            onSelect={() => setPreference(option.value)}
            onKeyDown={(event) => move(event, index)}
          />
        ))}
      </div>
    </section>
  );
}

interface ThemeOptionProps {
  option: { value: ThemePreference; label: string };
  selected: boolean;
  onSelect: () => void;
  onKeyDown: (event: React.KeyboardEvent) => void;
}

function ThemeOption({ option, selected, onSelect, onKeyDown }: ThemeOptionProps): React.JSX.Element {
  return (
    <button
      type="button"
      id={`theme-${option.value}`}
      role="radio"
      aria-checked={selected}
      tabIndex={selected ? 0 : -1}
      onClick={onSelect}
      onKeyDown={onKeyDown}
      className={`focus-visible:ring-primary focus-visible:ring-offset-background flex items-center gap-2.5 rounded-lg border px-4 py-2.5 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 ${
        selected
          ? 'border-primary text-text-primary'
          : 'border-border text-text-secondary hover:bg-surface-elevated'
      }`}
    >
      <Swatch theme={option.value} />
      {option.label}
    </button>
  );
}

/**
 * A small sample of what the option looks like, so «Світла» is a colour on
 * the page rather than a word. The `system` sample is split down the middle,
 * which is the only honest picture of an answer that depends on the machine.
 *
 * These squares must show the *other* theme's background while standing in
 * this one, so they read the two `preview` tokens, which hold each theme's
 * paper and, unlike every other colour, do not change with the theme.
 */
function Swatch({ theme }: { theme: ThemePreference }): React.JSX.Element {
  const dark = <span className="block h-full w-1/2 bg-preview-dark" />;
  const light = <span className="block h-full w-1/2 bg-preview-light" />;

  return (
    <span
      aria-hidden="true"
      // A heavier border than elsewhere on purpose: the sample of the theme
      // you are already in is the same colour as the page around it, and
      // without a visible edge it reads as nothing rather than as a square.
      className="border-text-muted/60 flex h-4 w-6 overflow-hidden rounded-[3px] border"
    >
      {theme === 'light' ? (
        <>
          {light}
          {light}
        </>
      ) : theme === 'dark' ? (
        <>
          {dark}
          {dark}
        </>
      ) : (
        <>
          {dark}
          {light}
        </>
      )}
    </span>
  );
}
