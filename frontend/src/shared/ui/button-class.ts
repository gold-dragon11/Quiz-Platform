export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

/*
 * Loom's controls: square, flat, one filled primary. The secondary is a
 * transparent square with an edge in the field colour (3:1 against every
 * surface) that takes the ink on hover; nothing lifts, glows or rounds.
 */
const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-on-primary hover:bg-primary-hover active:bg-primary-active',
  secondary:
    'bg-transparent text-text-primary border border-field hover:border-text-primary active:bg-surface-elevated',
  ghost: 'bg-transparent text-text-secondary hover:text-text-primary active:text-text-primary',
  outline:
    'bg-transparent text-text-primary border border-field hover:border-text-primary active:bg-surface-elevated',
  danger: 'bg-error text-on-primary hover:opacity-90 active:opacity-80',
};

const SIZE_CLASS: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
  // Marketing scale — large enough to hold its own against a display-size
  // headline. Added rather than growing `lg`, which the auth forms rely on.
  xl: 'h-14 px-8 text-lg',
};

/**
 * The button's look as a class string, for an element that is not a button:
 * a `<Link>` that moves the reader somewhere is a link, and stays one for the
 * keyboard, a screen reader and «open in a new tab», whatever it looks like.
 */
export function buttonClassName({
  variant = 'primary',
  size = 'md',
  className = '',
}: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}): string {
  return `focus-visible:ring-focus inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background ${VARIANT_CLASS[variant]} ${SIZE_CLASS[size]} ${className}`;
}
