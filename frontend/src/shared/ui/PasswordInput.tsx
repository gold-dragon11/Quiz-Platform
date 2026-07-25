import { forwardRef, useState } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';
import { Input } from '@/shared/ui/Input';

interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  helperText?: string;
  error?: string;
}

/**
 * Password field (docs/07-design/components.md §5) with a show/hide toggle.
 * Wraps the shared Input so it inherits the same label/error/accessibility
 * behaviour; the toggle is keyboard reachable and announces its state.
 */
export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>((props, ref) => {
  const [visible, setVisible] = useState(false);

  const toggle: ReactNode = (
    <button
      type="button"
      onClick={() => setVisible((v) => !v)}
      aria-label={visible ? 'Hide password' : 'Show password'}
      aria-pressed={visible}
      className="text-text-muted hover:text-text-secondary rounded px-2 py-1 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      {visible ? 'Hide' : 'Show'}
    </button>
  );

  return <Input ref={ref} type={visible ? 'text' : 'password'} endAdornment={toggle} {...props} />;
});

PasswordInput.displayName = 'PasswordInput';
