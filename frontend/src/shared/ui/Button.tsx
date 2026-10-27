import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import { Spinner } from '@/shared/ui/Spinner';
import { buttonClassName, type ButtonSize, type ButtonVariant } from '@/shared/ui/button-class';

export type { ButtonSize, ButtonVariant } from '@/shared/ui/button-class';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows a spinner and disables the button while an action is in flight. */
  isLoading?: boolean;
  fullWidth?: boolean;
}

/**
 * Primary interactive control (docs/07-design/components.md §4). Covers the
 * documented variants and states, including a disabled + spinner `loading`
 * state. Focus is always visible for keyboard users (§16).
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      fullWidth = false,
      disabled,
      className = '',
      children,
      type = 'button',
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        className={buttonClassName({
          variant,
          size,
          className: `disabled:cursor-not-allowed disabled:opacity-60 ${fullWidth ? 'w-full' : ''} ${className}`,
        })}
        {...props}
      >
        {isLoading && <Spinner />}
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';
