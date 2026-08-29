import { useEffect, useId, useRef, useState } from 'react';
import { MathText } from '@/shared/ui/MathText';

export interface MathSelectOption {
  value: string;
  /** May contain LaTeX between `$…$`. */
  label: string;
}

interface MathSelectProps {
  options: MathSelectOption[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  'aria-label'?: string;
}

/**
 * A dropdown whose options can carry formulas.
 *
 * A native `<select>` cannot hold markup, so its options can only ever be
 * plain text — which left matching questions in mathematics showing
 * `x^2 - 25` where every other answer on the page was typeset. This is the
 * smallest replacement that fixes that: a button plus a listbox, built to the
 * ARIA combobox pattern so it keeps the keyboard and screen-reader behaviour
 * the native control gave for free.
 *
 * Keyboard: Enter, Space, or the arrow keys open it; arrows move the
 * highlight; Enter or Space chooses; Escape closes without choosing; Home and
 * End jump to the ends; Tab closes and moves on. The highlight is announced
 * through `aria-activedescendant` rather than by moving focus, so the trigger
 * keeps focus the whole time.
 */
export function MathSelect({
  options,
  value,
  onChange,
  disabled = false,
  placeholder = '— оберіть відповідність —',
  'aria-label': ariaLabel,
}: MathSelectProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const id = useId();
  const listboxId = `${id}-listbox`;

  const selectedIndex = options.findIndex((option) => option.value === value);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : null;

  const open = (): void => {
    if (disabled) {
      return;
    }
    setHighlighted(selectedIndex >= 0 ? selectedIndex : 0);
    setIsOpen(true);
  };

  const choose = (index: number): void => {
    const option = options[index];
    if (option) {
      onChange(option.value);
    }
    setIsOpen(false);
  };

  // Clicking anywhere else closes the list, the way a native dropdown does.
  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const onPointerDown = (event: PointerEvent): void => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [isOpen]);

  // Keep the highlighted option in view when the list is longer than its box.
  useEffect(() => {
    if (!isOpen) {
      return;
    }
    listRef.current?.querySelector(`[data-index="${highlighted}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [isOpen, highlighted]);

  const onKeyDown = (event: React.KeyboardEvent): void => {
    if (disabled) {
      return;
    }
    if (!isOpen) {
      if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(event.key)) {
        event.preventDefault();
        open();
      }
      return;
    }
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setHighlighted((i) => Math.min(i + 1, options.length - 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        setHighlighted((i) => Math.max(i - 1, 0));
        break;
      case 'Home':
        event.preventDefault();
        setHighlighted(0);
        break;
      case 'End':
        event.preventDefault();
        setHighlighted(options.length - 1);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        choose(highlighted);
        break;
      case 'Escape':
        event.preventDefault();
        setIsOpen(false);
        break;
      case 'Tab':
        setIsOpen(false);
        break;
      default:
        break;
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={isOpen ? listboxId : undefined}
        aria-activedescendant={isOpen ? `${id}-option-${highlighted}` : undefined}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => (isOpen ? setIsOpen(false) : open())}
        onKeyDown={onKeyDown}
        className={`bg-surface text-text-primary border-border focus:border-primary focus:ring-primary focus-visible:ring-offset-background flex h-11 w-full items-center justify-between gap-2 rounded-lg border px-3 text-left text-sm outline-none transition-colors focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60`}
      >
        <span className={`truncate ${selected ? '' : 'text-text-muted'}`}>
          {selected ? <MathText>{selected.label}</MathText> : placeholder}
        </span>
        <svg
          width={16}
          height={16}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={`text-text-muted shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {isOpen && (
        <ul
          ref={listRef}
          id={listboxId}
          role="listbox"
          aria-label={ariaLabel}
          className="border-border bg-surface-elevated absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border py-1 shadow-lg"
        >
          {options.map((option, index) => (
            <li
              key={option.value}
              id={`${id}-option-${index}`}
              data-index={index}
              role="option"
              aria-selected={option.value === value}
              // The trigger keeps focus, so the pointer must not steal it —
              // mousedown would blur the button before the click lands.
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setHighlighted(index)}
              onClick={() => choose(index)}
              className={`cursor-pointer px-3 py-2 text-sm ${
                index === highlighted ? 'bg-primary/15 text-text-primary' : 'text-text-secondary'
              }`}
            >
              <MathText>{option.label}</MathText>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
